// Atreemology — buying a root pack with Razorpay.
//
// The price, the pack and the buyer are all decided on the server: the browser
// only asks for an order, shows Razorpay's own payment window, then hands the
// signed result back for verification. Nothing here can grant access by itself.

import { api, isSignedIn } from './session.js?v=1';
import { refreshPacks } from './packs.js?v=1';

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise = null;
function loadCheckoutScript() {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CHECKOUT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      s.remove();
      reject(new Error('load'));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

/**
 * Start a purchase. Resolves to one of:
 *   { status: 'paid' }  { status: 'cancelled' }  { status: 'owned' }
 *   { status: 'sign-in' }  { status: 'error', message }
 */
export async function purchasePack(packId) {
  if (!isSignedIn()) return { status: 'sign-in' };

  let order;
  try {
    const res = await api('/functions/v1/create-order', { method: 'POST', body: { pack: packId } });
    const data = await readJson(res);
    if (res.status === 409) {
      await refreshPacks({ force: true });
      return { status: 'owned' };
    }
    if (res.status === 401) return { status: 'sign-in' };
    if (res.status === 503) return { status: 'error', message: "Purchases aren't open yet. Please check back soon." };
    if (res.status === 404) return { status: 'error', message: "This pack isn't available right now." };
    if (!res.ok || !data.order_id) return { status: 'error', message: "We couldn't start the payment. Please try again in a moment." };
    order = data;
  } catch (e) {
    if (e && e.code === 'signed-out') return { status: 'sign-in' };
    return { status: 'error', message: "We couldn't reach the server. Check your connection and try again." };
  }

  try {
    await loadCheckoutScript();
  } catch {
    return { status: 'error', message: "The payment window couldn't load. Check your connection and try again." };
  }

  const paid = await new Promise((resolve) => {
    let settled = false;
    const done = (v) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    try {
      const rzp = new window.Razorpay({
        key: order.key_id,
        order_id: order.order_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Atreemology',
        description: order.title,
        prefill: { email: order.email || '' },
        theme: { color: '#2f6e4e' },
        modal: { ondismiss: () => done({ cancelled: true }) },
        handler: (response) => done({ response }),
      });
      rzp.on('payment.failed', (r) => {
        const reason = r && r.error && r.error.description;
        done({ failed: reason || 'The payment did not go through.' });
      });
      rzp.open();
    } catch {
      done({ failed: "The payment window couldn't open." });
    }
  });

  if (paid.cancelled) return { status: 'cancelled' };
  if (paid.failed) return { status: 'error', message: paid.failed };

  const r = paid.response || {};
  try {
    const res = await api('/functions/v1/verify-payment', {
      method: 'POST',
      body: {
        razorpay_order_id: r.razorpay_order_id,
        razorpay_payment_id: r.razorpay_payment_id,
        razorpay_signature: r.razorpay_signature,
      },
    });
    if (res.ok) {
      await refreshPacks({ force: true });
      return { status: 'paid' };
    }
  } catch {
    /* fall through to the "paid but not confirmed yet" message */
  }
  // Money was taken but confirmation did not complete. The webhook will grant it
  // on the server regardless, so tell the learner to refresh rather than pay again.
  refreshPacks({ force: true }).catch(() => {});
  return {
    status: 'error',
    message: "Your payment went through but we couldn't confirm it yet. It will unlock shortly. Use “Restore purchases” in Profile if it doesn't.",
  };
}
