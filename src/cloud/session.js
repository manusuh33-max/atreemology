// Atreemology — account session (email-code sign-in) over Supabase's auth REST API.
// No SDK: plain fetch, so the app stays dependency-free.
//
// Sign-in uses a 6-digit code emailed to the learner rather than a magic link:
// links open in whatever browser handles the email, which on phones is often a
// different one from the installed app, and the app's own #/ routing would
// also collide with the tokens a link puts in the URL fragment.

import { CLOUD, KEYS, cloudEnabled, lsGet, lsSet, lsRemove } from './config.js?v=1';

export class CloudError extends Error {
  constructor(code, message) {
    super(message || code);
    this.code = code;
  }
}

function readSession() {
  try {
    const raw = lsGet(KEYS.session);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s && s.access_token && s.refresh_token && s.user && s.user.id) return s;
  } catch {
    /* fall through */
  }
  return null;
}

let session = readSession();
const listeners = new Set();

function writeSession(next) {
  session = next;
  if (next) lsSet(KEYS.session, JSON.stringify(next));
  else lsRemove(KEYS.session);
  listeners.forEach((fn) => {
    try {
      fn(session);
    } catch {
      /* a listener must never break auth */
    }
  });
}

if (typeof window !== 'undefined' && window.addEventListener) {
  // Another tab signed in or out.
  window.addEventListener('storage', (e) => {
    if (e.key !== KEYS.session) return;
    session = readSession();
    listeners.forEach((fn) => fn(session));
  });
}

export const getSession = () => session;
export const isSignedIn = () => Boolean(session);
export const currentUser = () => (session ? { id: session.user.id, email: session.user.email || '' } : null);

export function onSessionChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function normalizeSession(data) {
  if (!data || !data.access_token || !data.refresh_token || !data.user || !data.user.id) return null;
  const nowSec = Math.floor(Date.now() / 1000);
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Number(data.expires_at) || nowSec + (Number(data.expires_in) || 3600),
    user: { id: data.user.id, email: data.user.email || '' },
  };
}

async function errorText(res) {
  try {
    const body = await res.json();
    return body.msg || body.message || body.error_description || body.error || '';
  } catch {
    return '';
  }
}

let refreshing = null;

/** Swap the refresh token for a new access token. Single-flight. Returns the new access token or null. */
export function refreshSession() {
  if (!session || !cloudEnabled()) return Promise.resolve(null);
  if (refreshing) return refreshing;
  const refreshToken = session.refresh_token;
  refreshing = (async () => {
    try {
      const res = await fetch(`${CLOUD.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: CLOUD.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (res.ok) {
        const next = normalizeSession(await res.json());
        if (next) {
          writeSession(next);
          return next.access_token;
        }
        return null;
      }
      // A refresh token the server no longer recognises means the sign-in is over.
      if ([400, 401, 403].includes(res.status)) writeSession(null);
      return null;
    } catch {
      return null; // offline: keep the session, try again later
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function freshAccessToken() {
  if (!session) return null;
  const msLeft = session.expires_at * 1000 - Date.now();
  if (msLeft < 60_000) {
    const token = await refreshSession();
    return token || (session && msLeft > 0 ? session.access_token : null);
  }
  return session.access_token;
}

/**
 * Call the backend. auth: 'user' sends the learner's token (and refreshes it
 * when needed); 'anon' sends only the public project key.
 */
export async function api(path, { method = 'GET', body, headers = {}, auth = 'user', signal, keepalive } = {}) {
  if (!cloudEnabled()) throw new CloudError('disabled', 'Cloud features are not configured.');
  const send = async (token) =>
    fetch(CLOUD.url + path, {
      method,
      headers: {
        apikey: CLOUD.anonKey,
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      keepalive,
    });

  if (auth !== 'user') return send(CLOUD.anonKey);

  const token = await freshAccessToken();
  if (!token) throw new CloudError('signed-out', 'Not signed in.');
  let res = await send(token);
  if (res.status === 401) {
    const renewed = await refreshSession();
    if (renewed) res = await send(renewed);
  }
  return res;
}

// ---- email code sign-in ----

export async function requestEmailCode(email) {
  if (!cloudEnabled()) return { ok: false, reason: 'disabled' };
  const clean = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) return { ok: false, reason: 'invalid-email' };
  try {
    const res = await fetch(`${CLOUD.url}/auth/v1/otp`, {
      method: 'POST',
      headers: { apikey: CLOUD.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: clean, create_user: true }),
    });
    if (res.ok) return { ok: true, email: clean };
    if (res.status === 429) return { ok: false, reason: 'rate-limited' };
    if (res.status === 400 || res.status === 422) return { ok: false, reason: 'invalid-email', detail: await errorText(res) };
    return { ok: false, reason: 'server', detail: await errorText(res) };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}

export async function verifyEmailCode(email, code) {
  if (!cloudEnabled()) return { ok: false, reason: 'disabled' };
  const token = String(code || '').replace(/\s+/g, '');
  if (!/^\d{6,10}$/.test(token)) return { ok: false, reason: 'bad-code' };
  try {
    const res = await fetch(`${CLOUD.url}/auth/v1/verify`, {
      method: 'POST',
      headers: { apikey: CLOUD.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'email', email: String(email).trim().toLowerCase(), token }),
    });
    if (res.ok) {
      const next = normalizeSession(await res.json());
      if (!next) return { ok: false, reason: 'server' };
      writeSession(next);
      return { ok: true, user: currentUser() };
    }
    if ([400, 401, 403, 422].includes(res.status)) return { ok: false, reason: 'bad-code' };
    if (res.status === 429) return { ok: false, reason: 'rate-limited' };
    return { ok: false, reason: 'server' };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}

export async function signOut() {
  const token = session && session.access_token;
  writeSession(null);
  if (!token || !cloudEnabled()) return;
  try {
    await fetch(`${CLOUD.url}/auth/v1/logout?scope=local`, {
      method: 'POST',
      headers: { apikey: CLOUD.anonKey, Authorization: `Bearer ${token}` },
    });
  } catch {
    /* already signed out on this device, which is what matters */
  }
}

/** Forget the session locally without telling the server (used after the account is deleted). */
export function clearSessionLocally() {
  writeSession(null);
}

// ---- Google sign-in (optional; hidden unless googleEnabled is set) ----

export function googleSignInUrl() {
  const back = `${location.origin}${location.pathname}`;
  return `${CLOUD.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(back)}`;
}

/**
 * Call once before the app boots. If the page was opened by returning from
 * Google, the sign-in tokens are in the URL fragment: read them, save the
 * session, and put the app's own #/profile route back so the router is happy.
 */
export async function captureOAuthRedirect() {
  if (!cloudEnabled() || typeof location === 'undefined') return null;
  const hash = location.hash || '';
  if (!/^#(access_token|error)=/.test(hash)) return null;
  const params = new URLSearchParams(hash.slice(1));
  const restore = () => history.replaceState(null, '', `${location.pathname}${location.search}#/profile`);

  if (params.get('error')) {
    const description = params.get('error_description') || params.get('error');
    restore();
    return { ok: false, error: description.replace(/\+/g, ' ') };
  }
  const access = params.get('access_token');
  const refresh = params.get('refresh_token');
  if (!access || !refresh) {
    restore();
    return null;
  }
  try {
    const res = await fetch(`${CLOUD.url}/auth/v1/user`, {
      headers: { apikey: CLOUD.anonKey, Authorization: `Bearer ${access}` },
    });
    if (!res.ok) throw new Error('user lookup failed');
    const user = await res.json();
    const next = normalizeSession({
      access_token: access,
      refresh_token: refresh,
      expires_at: params.get('expires_at'),
      expires_in: params.get('expires_in'),
      user,
    });
    if (!next) throw new Error('bad session');
    writeSession(next);
    restore();
    return { ok: true, user: currentUser() };
  } catch {
    restore();
    return { ok: false, error: 'Sign-in with Google did not complete. Please try again.' };
  }
}
