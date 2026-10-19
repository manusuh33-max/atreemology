// Atreemology — server-side logic for purchases and account deletion.
// Runs inside Supabase Edge Functions (Deno) and under Node for tests: plain
// JavaScript, Web Crypto and fetch only. Every external call goes through the
// injected `fetchFn`, so the tests can stand in for Razorpay and Supabase.
//
// Rules this file enforces:
//  * Prices come from the packs table, never from the browser.
//  * A purchase is tied to its order row (user + pack + amount) created here.
//  * Payments are confirmed by Razorpay's HMAC signature (checkout callback)
//    or by its signed webhook; nothing else can grant a pack.
//  * Granting is idempotent: the same payment id can only ever add one row.

const enc = new TextEncoder();

export async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
  return [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string comparison. */
export function safeEqual(a, b) {
  const x = String(a || '');
  const y = String(b || '');
  let diff = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return diff === 0;
}

export function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || 'https://atreemology.com,https://www.atreemology.com')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function corsHeaders(origin, env) {
  const headers = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (origin && allowedOrigins(env).includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

const reply = (status, body, extra = {}) => ({ status, body, extra });

export function createContext(env, fetchFn) {
  const base = String(env.SUPABASE_URL || '').replace(/\/+$/, '');
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  async function rest(method, path, body, prefer) {
    const res = await fetchFn(`${base}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`database ${method} ${path} failed (${res.status})`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function getUser(bearer) {
    if (!bearer) return null;
    const res = await fetchFn(`${base}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${bearer}` } });
    if (!res.ok) return null;
    const user = await res.json();
    return user && user.id ? { id: user.id, email: user.email || '' } : null;
  }

  return { env, fetchFn, base, serviceKey, rest, getUser };
}

const PACK_ID = /^[a-z0-9-]{1,40}$/;
const RZP_ID = /^[A-Za-z0-9_]{6,64}$/;

/** Idempotently record a confirmed payment and mark its order paid. */
export async function grantPurchase(ctx, order, paymentId) {
  if (!order.user_id) return { granted: false, reason: 'account-deleted' };
  await ctx.rest(
    'POST',
    'entitlements?on_conflict=payment_id',
    { user_id: order.user_id, pack: order.pack, source: 'razorpay', payment_id: paymentId, amount: order.amount, currency: order.currency },
    'resolution=ignore-duplicates,return=minimal'
  );
  await ctx.rest('PATCH', `payment_orders?order_id=eq.${encodeURIComponent(order.order_id)}`, { status: 'paid' }, 'return=minimal');
  return { granted: true };
}

async function findOrder(ctx, orderId) {
  const rows = await ctx.rest('GET', `payment_orders?order_id=eq.${encodeURIComponent(orderId)}&select=*`);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

// ---------- create-order ----------

export async function handleCreateOrder(ctx, { bearer, body }) {
  const user = await ctx.getUser(bearer);
  if (!user) return reply(401, { error: 'sign_in_required' });
  const pack = body && body.pack;
  if (typeof pack !== 'string' || !PACK_ID.test(pack)) return reply(400, { error: 'bad_pack' });

  const { RAZORPAY_KEY_ID: keyId, RAZORPAY_KEY_SECRET: keySecret } = ctx.env;
  if (!keyId || !keySecret) return reply(503, { error: 'payments_unavailable' });

  const packs = await ctx.rest('GET', `packs?id=eq.${encodeURIComponent(pack)}&published=eq.true&select=id,title,price_inr_paise`);
  const row = Array.isArray(packs) && packs[0];
  if (!row) return reply(404, { error: 'pack_not_found' });
  if (!Number.isInteger(row.price_inr_paise) || row.price_inr_paise <= 0) return reply(400, { error: 'not_for_sale' });

  const covers = pack === 'all-access' ? 'all-access' : `${pack},all-access`;
  const owned = await ctx.rest('GET', `entitlements?user_id=eq.${encodeURIComponent(user.id)}&pack=in.(${covers})&select=id&limit=1`);
  if (Array.isArray(owned) && owned.length) return reply(409, { error: 'already_owned' });

  const receipt = `at_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
  const res = await ctx.fetchFn('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}` },
    body: JSON.stringify({ amount: row.price_inr_paise, currency: 'INR', receipt, notes: { pack: row.id } }),
  });
  if (!res.ok) return reply(502, { error: 'payment_provider_error' });
  const order = await res.json();
  if (!order || !order.id) return reply(502, { error: 'payment_provider_error' });

  await ctx.rest('POST', 'payment_orders', { order_id: order.id, user_id: user.id, pack: row.id, amount: row.price_inr_paise, currency: 'INR' }, 'return=minimal');
  return reply(200, { order_id: order.id, amount: row.price_inr_paise, currency: 'INR', key_id: keyId, pack: row.id, title: row.title, email: user.email });
}

// ---------- verify-payment (called by the browser right after checkout) ----------

export async function handleVerifyPayment(ctx, { bearer, body }) {
  const user = await ctx.getUser(bearer);
  if (!user) return reply(401, { error: 'sign_in_required' });
  const orderId = body && body.razorpay_order_id;
  const paymentId = body && body.razorpay_payment_id;
  const signature = body && body.razorpay_signature;
  if (![orderId, paymentId].every((v) => typeof v === 'string' && RZP_ID.test(v)) || typeof signature !== 'string') {
    return reply(400, { error: 'bad_request' });
  }
  const secret = ctx.env.RAZORPAY_KEY_SECRET;
  if (!secret) return reply(503, { error: 'payments_unavailable' });

  const order = await findOrder(ctx, orderId);
  if (!order || order.user_id !== user.id) return reply(404, { error: 'order_not_found' });

  const expected = await hmacHex(secret, `${orderId}|${paymentId}`);
  if (!safeEqual(expected, signature)) return reply(400, { error: 'bad_signature' });

  await grantPurchase(ctx, order, paymentId);
  return reply(200, { ok: true, pack: order.pack });
}

// ---------- razorpay-webhook ----------

export async function handleWebhook(ctx, { rawBody, signature }) {
  const secret = ctx.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return reply(503, { error: 'webhook_unavailable' });
  const expected = await hmacHex(secret, rawBody);
  if (!safeEqual(expected, signature)) return reply(401, { error: 'bad_signature' });

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return reply(400, { error: 'bad_json' });
  }
  if (event.event !== 'payment.captured' && event.event !== 'order.paid') return reply(200, { ignored: true });

  const payment = event.payload && event.payload.payment && event.payload.payment.entity;
  if (!payment || payment.status !== 'captured' || typeof payment.id !== 'string' || typeof payment.order_id !== 'string') {
    return reply(200, { ignored: true });
  }
  const order = await findOrder(ctx, payment.order_id);
  if (!order) return reply(200, { ignored: true, reason: 'unknown_order' });
  if (payment.amount !== order.amount || payment.currency !== order.currency) return reply(200, { ignored: true, reason: 'amount_mismatch' });

  const result = await grantPurchase(ctx, order, payment.id);
  return reply(200, { ok: true, ...result });
}

// ---------- delete-account ----------

export async function handleDeleteAccount(ctx, { bearer }) {
  const user = await ctx.getUser(bearer);
  if (!user) return reply(401, { error: 'sign_in_required' });
  const res = await ctx.fetchFn(`${ctx.base}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
    method: 'DELETE',
    headers: { apikey: ctx.serviceKey, Authorization: `Bearer ${ctx.serviceKey}` },
  });
  if (!res.ok) return reply(502, { error: 'delete_failed' });
  return reply(200, { ok: true });
}

// ---------- the Deno.serve handler ----------

export function makeHandler(kind, env, fetchFn) {
  return async (req) => {
    const origin = req.headers.get('origin') || '';
    const cors = corsHeaders(origin, env);
    const send = ({ status, body, extra }) =>
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...cors, ...extra } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return send(reply(405, { error: 'method_not_allowed' }));

    try {
      const raw = await req.text();
      if (raw.length > 20_000) return send(reply(413, { error: 'too_large' }));
      const ctx = createContext(env, fetchFn);
      const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');

      if (kind === 'razorpay-webhook') {
        return send(await handleWebhook(ctx, { rawBody: raw, signature: req.headers.get('x-razorpay-signature') || '' }));
      }
      let body = {};
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        return send(reply(400, { error: 'bad_json' }));
      }
      if (kind === 'create-order') return send(await handleCreateOrder(ctx, { bearer, body }));
      if (kind === 'verify-payment') return send(await handleVerifyPayment(ctx, { bearer, body }));
      if (kind === 'delete-account') return send(await handleDeleteAccount(ctx, { bearer }));
      return send(reply(404, { error: 'unknown_function' }));
    } catch (err) {
      console.error(kind, err && err.message);
      return send(reply(500, { error: 'server_error' }));
    }
  };
}
