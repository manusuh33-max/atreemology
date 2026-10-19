// Atreemology — screens for the optional account, cloud sync and root packs.
//
// Nothing here changes the app's own screens. After each screen is drawn,
// app.js calls decorateRoute(); this file then fills two small placeholders:
//   #cloud-account-slot  (Profile)  — sign in / sync status / account actions
//   a "Root packs" shelf (Seed Library) — locked and unlocked packs
// If cloud features are not configured, the placeholders are simply removed.

import { el } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { CLOUD, cloudEnabled } from './config.js?v=1';
import {
  isSignedIn,
  currentUser,
  onSessionChange,
  requestEmailCode,
  verifyEmailCode,
  signOut,
  googleSignInUrl,
} from './session.js?v=1';
import { getSyncStatus, onSyncStatus, pushNow, syncAfterSignIn, deleteAccount, markFlash } from './sync.js?v=1';
import { getPackView, onPacksChange, refreshPacks } from './packs.js?v=1';
import { purchasePack } from './checkout.js?v=1';

// ---------- styles (injected, so the cached styles.css never needs to change) ----------

const CSS = `
.cl-card{background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:16px;margin-bottom:12px}
.cl-card h3{margin:0 0 6px;font-size:16px}
.cl-card p{margin:0 0 12px;font-size:13px;color:var(--color-text-muted);line-height:1.5}
.cl-card p:last-child{margin-bottom:0}
.cl-row{display:flex;flex-direction:column;gap:8px}
.cl-email{font-weight:600;word-break:break-all;color:var(--color-text)}
.cl-status{font-size:12px;color:var(--color-text-muted);display:flex;align-items:center;gap:6px;margin:0 0 10px}
.cl-dot{width:8px;height:8px;border-radius:50%;background:var(--color-leaf-bright,#3f9a56);flex:none}
.cl-dot--busy{background:var(--color-accent)}
.cl-dot--bad{background:var(--color-danger)}
.cl-note{background:var(--color-accent-soft);color:var(--color-accent-text);border-radius:var(--radius-sm);padding:10px 12px;font-size:13px;margin-bottom:10px}
.cl-link{background:none;border:0;padding:6px 0;color:var(--color-primary);font:inherit;font-size:13px;text-decoration:underline;cursor:pointer}
.cl-danger-link{color:var(--color-danger)}
.cl-pack{position:relative}
.cl-pack-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:6px}
.cl-pack-head h3{margin:0}
.cl-price{font-weight:700;color:var(--color-primary-dark);white-space:nowrap}
.cl-chips{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
.cl-chip{font-size:12px;padding:3px 10px;border-radius:999px;background:var(--color-surface-alt);border:1px solid var(--color-border);color:var(--color-text-muted)}
.cl-owned{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:var(--color-primary-dark);background:var(--color-primary-light);border-radius:999px;padding:3px 10px}
.cl-shelf-title{margin:20px 0 4px;font-size:18px}
.cl-shelf-sub{margin:0 0 12px;font-size:13px;color:var(--color-text-muted)}
.cl-toast{position:fixed;left:50%;bottom:calc(84px + env(safe-area-inset-bottom));transform:translate(-50%,12px);max-width:min(92vw,420px);background:var(--color-primary-dark);color:var(--color-on-primary-dark);padding:10px 16px;border-radius:999px;font-size:13px;box-shadow:var(--shadow-md);opacity:0;transition:opacity .2s,transform .2s;z-index:80;text-align:center}
.cl-toast.show{opacity:1;transform:translate(-50%,0)}
.cl-err{color:var(--color-danger);font-size:13px;min-height:18px;margin:6px 0 0}
.cl-code{letter-spacing:.4em;text-align:center;font-size:22px;font-variant-numeric:tabular-nums}
.cl-divider{display:flex;align-items:center;gap:10px;color:var(--color-text-faint);font-size:12px;margin:14px 0}
.cl-divider::before,.cl-divider::after{content:"";flex:1;height:1px;background:var(--color-border)}
.cl-small{font-size:12px;color:var(--color-text-muted);line-height:1.5}
`;

function ensureStyles() {
  if (document.getElementById('cloud-styles')) return;
  const s = document.createElement('style');
  s.id = 'cloud-styles';
  s.textContent = CSS;
  document.head.appendChild(s);
}

// ---------- toast ----------

let toastTimer = null;
export function showToast(message) {
  ensureStyles();
  let t = document.getElementById('cloud-toast');
  if (!t) {
    t = el('div.cl-toast#cloud-toast', { role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(t);
  }
  t.textContent = message;
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 4200);
}

// ---------- small helpers ----------

const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function timeAgo(ms) {
  if (!ms) return '';
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}

function openSheet(build) {
  ensureStyles();
  const overlay = el('div.sheet-overlay', { role: 'presentation' });
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  const sheet = el('div.sheet', { role: 'dialog', 'aria-modal': 'true' }, el('div.sheet-grabber'));
  build(sheet, close);
  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  return close;
}

const ERROR_TEXT = {
  'invalid-email': 'That email address doesn’t look right.',
  'rate-limited': 'Too many tries. Please wait a minute and try again.',
  offline: 'You seem to be offline. Check your connection and try again.',
  server: 'Something went wrong on our side. Please try again.',
  'bad-code': 'That code didn’t work. Check it and try again, or ask for a new one.',
  disabled: 'Accounts aren’t available right now.',
};

// ---------- sign-in sheet ----------

/**
 * Sign in or create an account with an emailed code.
 * `reason` is a short line shown at the top; `onDone` runs after a successful sign-in
 * (not when the page has to reload to pick up newer progress).
 */
export function openSignInSheet({ reason, onDone } = {}) {
  if (!cloudEnabled()) return;
  openSheet((sheet, close) => {
    let email = '';
    let cooldownTimer = null;

    const body = el('div');
    sheet.appendChild(body);
    const stop = () => clearInterval(cooldownTimer);
    const closeAll = () => {
      stop();
      close();
    };

    function stepEmail(message) {
      stop();
      const input = el('input.text-input', {
        type: 'email',
        inputmode: 'email',
        autocomplete: 'email',
        placeholder: 'you@example.com',
        value: email,
        'aria-label': 'Email address',
      });
      const err = el('p.cl-err', { role: 'alert' }, message || '');
      const send = el('button.btn.btn-primary.btn-block', { type: 'button' }, 'Email me a code');
      const submit = async () => {
        send.disabled = true;
        send.textContent = 'Sending…';
        err.textContent = '';
        const res = await requestEmailCode(input.value);
        if (res.ok) {
          email = res.email;
          stepCode();
        } else {
          err.textContent = ERROR_TEXT[res.reason] || ERROR_TEXT.server;
          send.disabled = false;
          send.textContent = 'Email me a code';
        }
      };
      send.addEventListener('click', submit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });

      body.replaceChildren(
        ...[
        el('h2.sheet-word', { style: 'text-transform:none' }, 'Sign in or create an account'),
        el('p.sheet-definition', reason || 'Keep your forest safe in the cloud and pick it up on any device. It’s free.'),
        el('label.field-label', 'Email', input),
        err,
        send,
        CLOUD.googleEnabled
          ? [
              el('div.cl-divider', 'or'),
              el('a.btn.btn-secondary.btn-block', { href: googleSignInUrl() }, 'Continue with Google'),
            ]
          : null,
        el(
          'p.cl-small',
          { style: 'margin-top:12px' },
          'We’ll email you a 6-digit code. No password to remember. We only use your email to sign you in and keep your purchases. ',
          el('a', { href: '/privacy.html', target: '_blank', rel: 'noopener' }, 'Privacy')
        ),
        el('button.btn.btn-ghost.btn-block', { type: 'button', onClick: closeAll }, 'Not now')
        ].flat().filter(Boolean)
      );
      setTimeout(() => input.focus(), 50);
    }

    function stepCode(message) {
      const input = el('input.text-input.cl-code', {
        type: 'text',
        inputmode: 'numeric',
        autocomplete: 'one-time-code',
        maxlength: '10',
        placeholder: '••••••',
        'aria-label': '6-digit code',
      });
      const err = el('p.cl-err', { role: 'alert' }, message || '');
      const go = el('button.btn.btn-primary.btn-block', { type: 'button' }, 'Sign in');
      const resend = el('button.cl-link', { type: 'button', disabled: true }, 'Send a new code');

      let wait = 30;
      const tick = () => {
        if (wait > 0) {
          resend.disabled = true;
          resend.textContent = `Send a new code (${wait}s)`;
          wait -= 1;
        } else {
          resend.disabled = false;
          resend.textContent = 'Send a new code';
          clearInterval(cooldownTimer);
        }
      };
      clearInterval(cooldownTimer);
      cooldownTimer = setInterval(tick, 1000);
      tick();

      const submit = async () => {
        go.disabled = true;
        go.textContent = 'Checking…';
        err.textContent = '';
        const res = await verifyEmailCode(email, input.value);
        if (!res.ok) {
          err.textContent = ERROR_TEXT[res.reason] || ERROR_TEXT.server;
          go.disabled = false;
          go.textContent = 'Sign in';
          return;
        }
        go.textContent = 'Syncing your forest…';
        const sync = await syncAfterSignIn();
        stop();
        if (sync.reload) {
          markFlash('Signed in. Your saved progress has been loaded.');
          location.reload();
          return;
        }
        close();
        showToast(sync.offline ? 'Signed in. Your progress will sync when you’re online.' : 'Signed in. Your forest is now saved to the cloud.');
        refreshPacks({ force: true }).catch(() => {});
        refreshSlots();
        if (onDone) onDone();
      };
      go.addEventListener('click', submit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });
      resend.addEventListener('click', async () => {
        resend.disabled = true;
        const res = await requestEmailCode(email);
        if (res.ok) {
          err.textContent = '';
          wait = 30;
          clearInterval(cooldownTimer);
          cooldownTimer = setInterval(tick, 1000);
          tick();
          showToast('New code sent.');
        } else {
          err.textContent = ERROR_TEXT[res.reason] || ERROR_TEXT.server;
          resend.disabled = false;
        }
      });

      body.replaceChildren(
        el('h2.sheet-word', { style: 'text-transform:none' }, 'Check your email'),
        el('p.sheet-definition', `We sent a code to ${email}. It can take a minute, and it may land in spam.`),
        el('label.field-label', 'Code', input),
        err,
        go,
        el(
          'div',
          { style: 'display:flex;justify-content:space-between;margin-top:6px' },
          resend,
          el('button.cl-link', { type: 'button', onClick: () => stepEmail() }, 'Use a different email')
        )
      );
      setTimeout(() => input.focus(), 50);
    }

    stepEmail();
  });
}

// ---------- account section (Profile) ----------

let confirmingDelete = false;
let busy = false;

function statusLine() {
  const s = getSyncStatus();
  if (s.state === 'syncing') return { text: 'Syncing…', cls: '.cl-dot--busy' };
  if (s.state === 'offline') return { text: 'Offline. Will sync when you’re back online.', cls: '.cl-dot--busy' };
  if (s.state === 'error') return { text: 'Couldn’t sync just now. Will try again.', cls: '.cl-dot--bad' };
  return { text: s.lastSyncAt ? `Saved to the cloud ${timeAgo(s.lastSyncAt)}` : 'Waiting for the first sync…', cls: '' };
}

export function renderAccountSection() {
  ensureStyles();
  if (!isSignedIn()) {
    return el(
      'div.cl-card',
      el('h3', 'Save your forest to the cloud'),
      el(
        'p',
        'Create a free account to back up your progress and continue on another phone or computer. It’s optional. Atreemology works fine without one.'
      ),
      el('button.btn.btn-primary.btn-block', { type: 'button', onClick: () => openSignInSheet() }, icon('sparkle', 18), 'Sign in or create account')
    );
  }

  const user = currentUser();
  const st = statusLine();
  const sync = getSyncStatus();
  const sheetBtn = (label, handler, cls = '.btn-secondary') => el(`button.btn${cls}.btn-block`, { type: 'button', onClick: handler }, label);

  return el(
    'div.cl-card',
    el('h3', 'Your account'),
    el('p.cl-email', user.email || 'Signed in'),
    el('p.cl-status', el(`span.cl-dot${st.cls}`), st.text),
    sync.remoteNewer
      ? el(
          'div.cl-note',
          'Newer progress from another device is available. ',
          el('button.cl-link', { type: 'button', onClick: () => location.reload() }, 'Reload to get it')
        )
      : null,
    el(
      'div.cl-row',
      sheetBtn('Sync now', async () => {
        if (busy) return;
        busy = true;
        const ok = await pushNow();
        busy = false;
        showToast(ok ? 'Everything is synced.' : 'Couldn’t sync right now.');
        refreshSlots();
      }),
      sheetBtn('Restore purchases', async () => {
        const r = await refreshPacks({ force: true });
        showToast(r && r.error ? 'Couldn’t check purchases right now.' : 'Purchases refreshed.');
      }),
      sheetBtn('Sign out', async () => {
        await signOut();
        showToast('Signed out. Your progress stays on this device.');
        refreshSlots();
      }, '.btn-ghost')
    ),
    el(
      'button.cl-link.cl-danger-link',
      {
        type: 'button',
        onClick: async (e) => {
          if (!confirmingDelete) {
            confirmingDelete = true;
            e.currentTarget.textContent = 'Tap again to permanently delete your account and cloud data';
            setTimeout(() => {
              if (confirmingDelete) {
                confirmingDelete = false;
                refreshSlots();
              }
            }, 5000);
            return;
          }
          confirmingDelete = false;
          const ok = await deleteAccount();
          showToast(ok ? 'Account deleted. Your progress stays on this device.' : 'Couldn’t delete the account. Please try again.');
          refreshSlots();
        },
      },
      'Delete my account'
    ),
    el('p.cl-small', { style: 'margin-top:6px' }, 'Deleting removes your cloud copy and your purchases from our servers. The forest on this device is not touched.')
  );
}

// ---------- pack shelf (Seed Library) ----------

function previewChips(preview) {
  const items = Array.isArray(preview) ? preview : [];
  return items
    .slice(0, 8)
    .map((p) => (typeof p === 'string' ? p : p && (p.root || p.title || p.name)))
    .filter(Boolean);
}

function packCard(pack, owned) {
  const chips = previewChips(pack.preview);
  const free = !(pack.price_inr_paise > 0);
  const buy = el(
    'button.btn.btn-accent.btn-block',
    { type: 'button' },
    icon('gift', 18),
    free ? 'Unlock' : `Unlock for ${rupees(pack.price_inr_paise)}`
  );
  buy.addEventListener('click', async () => {
    if (!isSignedIn()) {
      openSignInSheet({
        reason: `Create a free account so ${pack.title} stays unlocked on all your devices.`,
        onDone: () => buy.click(),
      });
      return;
    }
    buy.disabled = true;
    const original = buy.textContent;
    buy.textContent = 'Opening payment…';
    const r = await purchasePack(pack.id);
    buy.disabled = false;
    buy.textContent = original;
    if (r.status === 'paid') showToast(`${pack.title} is unlocked. Happy growing!`);
    else if (r.status === 'owned') showToast('You already own this pack.');
    else if (r.status === 'sign-in') openSignInSheet({ reason: 'Please sign in again to continue.' });
    else if (r.status === 'error') showToast(r.message);
  });

  return el(
    'div.cl-card.cl-pack',
    el(
      'div.cl-pack-head',
      el('h3', pack.title),
      owned ? el('span.cl-owned', icon('check', 14), 'Unlocked') : el('span.cl-price', free ? 'Free' : rupees(pack.price_inr_paise))
    ),
    pack.description ? el('p', pack.description) : null,
    pack.root_count > 0 && !pack.is_bundle ? el('p.cl-small', `${pack.root_count} root ${pack.root_count === 1 ? 'family' : 'families'}`) : null,
    chips.length ? el('div.cl-chips', chips.map((c) => el('span.cl-chip', c))) : null,
    owned ? null : buy,
    owned || free ? null : el('p.cl-small', { style: 'margin-top:8px' }, 'One-time payment, yours forever. No subscription.')
  );
}

export function renderPackShelf() {
  ensureStyles();
  const { catalog, owned } = getPackView();
  if (!catalog || !catalog.length) return null;
  const covered = (p) => owned.has(p.id) || owned.has('all-access');
  const singles = catalog.filter((p) => !p.is_bundle);
  const bundles = catalog.filter((p) => p.is_bundle);
  // Hide a bundle once every single pack is already owned.
  const bundleCards = bundles.filter((b) => !owned.has(b.id) && singles.some((p) => !covered(p)));
  return el(
    'section#cloud-shelf-slot',
    el('h2.cl-shelf-title', 'Root packs'),
    el('p.cl-shelf-sub', 'More root families to grow. The free forest stays free.'),
    singles.map((p) => packCard(p, covered(p))),
    bundleCards.map((p) => packCard(p, false)),
    owned.has('all-access') ? packCard(bundles[0] || { id: 'all-access', title: 'Everything, forever' }, true) : null
  );
}

// ---------- hooking into screens ----------

function refreshSlots() {
  const acct = document.getElementById('cloud-account-slot');
  if (acct) acct.replaceChildren(renderAccountSection());
  const shelf = document.getElementById('cloud-shelf-slot');
  const next = renderPackShelf();
  if (shelf) {
    if (next) shelf.replaceWith(next);
    else shelf.remove();
  } else if (next) {
    // The catalogue arrived after the Seed Library was drawn.
    insertShelf(document.querySelector('.seed-library-screen'), next);
  }
}

function insertShelf(screen, shelf) {
  if (!screen || !shelf) return;
  const anchor = screen.querySelector('.coming-soon-section');
  if (anchor) anchor.parentNode.insertBefore(shelf, anchor);
  else screen.appendChild(shelf);
}

let wired = false;
function wire() {
  if (wired) return;
  wired = true;
  onSessionChange(() => refreshSlots());
  onPacksChange(() => refreshSlots());
  onSyncStatus(() => {
    const acct = document.getElementById('cloud-account-slot');
    if (acct) acct.replaceChildren(renderAccountSection());
  });
}

/** Called by app.js after every screen is drawn. Never throws into the app. */
export function decorateRoute(route, main) {
  try {
    const slot = main.querySelector('#cloud-account-slot');
    if (!cloudEnabled()) {
      if (slot) slot.remove();
      return;
    }
    ensureStyles();
    wire();
    if (route.name === 'profile' && slot) {
      slot.replaceChildren(renderAccountSection());
    }
    if (route.name === 'seeds' && !main.querySelector('#cloud-shelf-slot')) {
      insertShelf(main.querySelector('.seed-library-screen'), renderPackShelf());
    }
  } catch (err) {
    console.warn('cloud ui skipped:', err);
  }
}
