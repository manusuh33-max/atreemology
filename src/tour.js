// Atreemology — guided app tour.
//
// A short coach-mark walkthrough of the five pages in the main navigation.
// It spotlights one nav tab at a time, actually navigates to that page behind
// the spotlight so people see what they're being told about, and lets them
// tap the highlighted tab itself to move on.
//
// Deliberately self-contained, so it never touches the app store or the
// saved progress format:
//   - its own tiny localStorage flag (below), not part of the main state
//   - its own styles, injected as one <style> tag, not added to styles.css
//   - it reads the nav tabs straight from the DOM (.bottom-nav .nav-tab, in
//     the same order bottomNav.js renders them), so it works unchanged for the
//     mobile bottom bar and the desktop sidebar.
//
// Flow: onboarding.js calls markTourPending() when the first seed is planted;
// app.js calls maybeStartTour() after every render, which starts the tour once
// that flag is set. Profile has a "Take the app tour" button (startTour) for
// replays and for anyone who onboarded before the tour existed.

import { el } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { navigate } from './router.js';

const TOUR_KEY = 'atreemology:v1:tour';

function readFlag() {
  try {
    return localStorage.getItem(TOUR_KEY);
  } catch {
    return null;
  }
}

function writeFlag(value) {
  try {
    localStorage.setItem(TOUR_KEY, value);
  } catch {
    // Private mode / blocked storage: the tour just won't remember it was seen.
  }
}

/** Called by onboarding the moment the first seed is planted. */
export function markTourPending() {
  writeFlag('pending');
}

// `tab` is the index of the nav tab to spotlight (Home, Seeds, Forest,
// Rewards, Profile — same order as TABS in ui/bottomNav.js). Steps without a
// tab are centered cards.
const STEPS = [
  {
    kind: 'intro',
    art: '🧭',
    title: 'A 30-second tour',
    body: 'Atreemology has five pages, always one tap away. Let’s take a quick look at what each one is for.',
    next: 'Start the tour',
  },
  {
    tab: 0,
    route: '#/home',
    icon: 'home',
    title: 'Home: your daily starting point',
    body: 'See your streak and forest stats, plus one big button that always tells you what to do next: tend the words that are due, or keep growing a tree.',
  },
  {
    tab: 1,
    route: '#/seeds',
    icon: 'seed',
    title: 'Seeds: choose what to learn',
    body: 'The Seed Library lists every root. Search it, plant new seeds, and see which are growing, ready to plant, or still on the roadmap.',
  },
  {
    tab: 2,
    route: '#/forest',
    icon: 'forest',
    title: 'Forest: everything you’ve grown',
    body: 'Every tree you plant lives here. Tap one to open its words. A word built from two roots shows up as a branch linking both trees.',
  },
  {
    tab: 3,
    route: '#/rewards',
    icon: 'reward',
    title: 'Rewards: your milestones',
    body: 'Finish a tree to earn its reward. Your streak and milestone badges live here too.',
  },
  {
    tab: 4,
    route: '#/profile',
    icon: 'profile',
    title: 'Profile: settings and progress',
    body: 'Set your name, switch on calm mode, read your full field journal, and export a backup. Your forest is saved only on this device, so a backup now and then is worth it.',
  },
  {
    kind: 'outro',
    art: '🌳',
    title: 'You’re all set',
    body: 'Tap a seed or a tree anywhere to open its lesson, and come back to Home to tend your words. You can replay this tour any time from Profile.',
    next: 'Start growing',
    nextReplay: 'Done',
  },
];

const NAV_TAB_SELECTOR = '.bottom-nav .nav-tab';
const DESKTOP_MIN_WIDTH = 900;

const CSS = `
.tour-root { position: fixed; inset: 0; z-index: 200; overflow: hidden; font-family: var(--font-sans); }
.tour-blocker { position: absolute; inset: 0; }
.tour-scrim { position: absolute; inset: 0; background: rgba(14, 22, 15, 0.62); opacity: 0; pointer-events: none; transition: opacity 220ms ease; }
.tour-scrim.on { opacity: 1; }
.tour-spot { position: absolute; border-radius: 14px; box-shadow: 0 0 0 100vmax rgba(14, 22, 15, 0.62); opacity: 0; pointer-events: none; transition: left 280ms ease, top 280ms ease, width 280ms ease, height 280ms ease, opacity 160ms ease; }
.tour-spot::after { content: ''; position: absolute; inset: -4px; border-radius: 18px; border: 2px solid var(--color-accent); animation: tour-pulse 1.6s ease-out infinite; }
.tour-spot.on { opacity: 1; pointer-events: auto; cursor: pointer; }
@keyframes tour-pulse { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(1.14); opacity: 0; } }
.tour-card { position: fixed; box-sizing: border-box; width: min(400px, calc(100vw - 24px)); background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); border-radius: var(--radius-md); box-shadow: var(--shadow-md); padding: 16px 18px 16px; animation: tour-in 220ms ease; }
.tour-card--center { left: 50%; top: 50%; transform: translate(-50%, -50%); text-align: center; }
.tour-card:focus { outline: none; }
@keyframes tour-in { from { opacity: 0; } to { opacity: 1; } }
.tour-head { display: flex; align-items: center; justify-content: space-between; min-height: 28px; }
.tour-count { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-text-faint); }
.tour-card--center .tour-head { justify-content: center; position: relative; }
.tour-card--center .tour-skip { position: absolute; right: 0; }
.tour-skip { background: none; border: none; color: var(--color-text-muted); font: inherit; font-size: 13px; font-weight: 600; padding: 6px 4px; cursor: pointer; }
.tour-skip:hover { color: var(--color-text); text-decoration: underline; }
.tour-skip:focus-visible, .tour-card .btn:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }
.tour-art { font-size: 46px; line-height: 1; margin: 10px 0 4px; }
.tour-title { display: flex; align-items: center; gap: 10px; margin: 6px 0 6px; font-size: 19px; line-height: 1.25; font-weight: 800; color: var(--color-primary-dark); }
.tour-card--center .tour-title { justify-content: center; }
.tour-title .icon { color: var(--color-primary); flex: none; display: inline-flex; }
.tour-title .icon svg { width: 100%; height: 100%; }
.tour-body { margin: 0 0 14px; font-size: 15px; line-height: 1.5; color: var(--color-text-muted); }
.tour-dots { display: flex; gap: 6px; align-items: center; }
.tour-card--center .tour-dots { justify-content: center; margin-bottom: 14px; }
.tour-dot { width: 7px; height: 7px; border-radius: 99px; background: var(--color-border); transition: width 200ms ease, background 200ms ease; }
.tour-dot.active { width: 18px; background: var(--color-primary); }
.tour-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 14px; }
.tour-card--center .tour-actions { justify-content: center; }
.tour-hint { margin: 10px 0 0; font-size: 12.5px; color: var(--color-text-faint); }
.tour-arrow { position: absolute; width: 14px; height: 14px; background: var(--color-surface); border: 1px solid var(--color-border); transform: rotate(45deg); display: none; }
.tour-arrow--down { display: block; bottom: -8px; border-top-color: transparent; border-left-color: transparent; }
.tour-arrow--left { display: block; left: -8px; border-top-color: transparent; border-right-color: transparent; }
@media (prefers-reduced-motion: reduce) {
  .tour-spot, .tour-scrim, .tour-dot { transition: none; }
  .tour-spot::after { animation: none; display: none; }
  .tour-card { animation: none; }
}
`;

function ensureStyles() {
  if (document.getElementById('tour-styles')) return;
  const style = document.createElement('style');
  style.id = 'tour-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

let active = null;
let scheduled = false;

// The tour is a nicety: if anything in it ever throws, it must not take the
// app down (app.js turns uncaught errors into its crash screen). Handlers are
// wrapped so a failure quietly closes the tour instead.
function guard(t, fn) {
  return (...args) => {
    try {
      return fn(...args);
    } catch (error) {
      console.warn('Atreemology tour error; closing the tour.', error);
      abort(t);
    }
  };
}

function abort(t) {
  if (active !== t) return;
  active = null;
  clearTimeout(t.retryTimer);
  document.removeEventListener('keydown', t.onKey, true);
  window.removeEventListener('resize', t.onResize);
  window.removeEventListener('orientationchange', t.onResize);
  setBackgroundInert(false);
  if (t.root) t.root.remove();
  writeFlag('done');
}

// While the tour is open the app behind it shouldn't be reachable by keyboard
// or screen reader (the card is aria-modal).
function setBackgroundInert(on) {
  const root = document.getElementById('root');
  if (!root) return;
  if (on) root.setAttribute('inert', '');
  else root.removeAttribute('inert');
}

/** Starts the tour once, after the first-seed onboarding, if it's still pending. */
export function maybeStartTour() {
  if (active || scheduled || readFlag() !== 'pending') return;
  scheduled = true;
  // Let the lesson page finish drawing behind the first card.
  setTimeout(() => {
    scheduled = false;
    try {
      if (!active && readFlag() === 'pending') startTour();
    } catch (error) {
      console.warn('Atreemology tour could not start.', error);
      writeFlag('done');
    }
  }, 450);
}

/** Starts the tour now (also used by the Profile "Take the app tour" button). */
export function startTour() {
  if (active) return;
  ensureStyles();

  const replay = readFlag() === 'done';
  const t = {
    index: 0,
    replay,
    startHash: window.location.hash || '#/home',
    prevFocus: document.activeElement,
    retryTimer: null,
  };
  active = t;

  t.blocker = el('div.tour-blocker');
  t.scrim = el('div.tour-scrim');
  t.spot = el('div.tour-spot', { onClick: guard(t, () => next(t)) });
  t.card = el('div.tour-card', {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': 'tour-title',
    'aria-describedby': 'tour-body',
    tabindex: '-1',
  });
  t.root = el('div.tour-root', t.blocker, t.scrim, t.spot, t.card);
  document.body.appendChild(t.root);

  t.onKey = guard(t, (e) => onKey(t, e));
  t.onResize = guard(t, () => place(t));
  setBackgroundInert(true);
  document.addEventListener('keydown', t.onKey, true);
  window.addEventListener('resize', t.onResize);
  window.addEventListener('orientationchange', t.onResize);

  try {
    go(t, 0);
  } catch (error) {
    console.warn('Atreemology tour could not start.', error);
    abort(t);
  }
}

function end(t) {
  if (active !== t) return;
  active = null;
  clearTimeout(t.retryTimer);
  document.removeEventListener('keydown', t.onKey, true);
  window.removeEventListener('resize', t.onResize);
  window.removeEventListener('orientationchange', t.onResize);
  t.root.remove();
  setBackgroundInert(false);
  writeFlag('done');
  // Put people back where they were when the tour began.
  if (window.location.hash !== t.startHash) navigate(t.startHash);
  if (t.prevFocus && typeof t.prevFocus.focus === 'function' && t.prevFocus.isConnected) {
    try {
      t.prevFocus.focus({ preventScroll: true });
    } catch {
      // Element can't take focus; nothing to restore.
    }
  }
}

function next(t) {
  if (t.index >= STEPS.length - 1) end(t);
  else go(t, t.index + 1);
}

function back(t) {
  if (t.index > 0) go(t, t.index - 1);
}

function onKey(t, e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    end(t);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    next(t);
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    back(t);
  } else if (e.key === 'Tab') {
    // Keep keyboard focus inside the card while the tour is open.
    const focusables = [...t.card.querySelectorAll('button')];
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!t.card.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

function go(t, index) {
  t.index = index;
  const step = STEPS[index];
  renderCard(t, step);
  if (step.route && window.location.hash !== step.route) navigate(step.route);
  clearTimeout(t.retryTimer);
  placeWhenReady(t, 0);
}

function renderCard(t, step) {
  const centered = step.tab == null;
  const isLast = t.index === STEPS.length - 1;
  const pageStepCount = STEPS.filter((s) => s.tab != null).length;

  let counter = 'Quick tour';
  if (step.tab != null) counter = `Page ${step.tab + 1} of ${pageStepCount}`;
  else if (isLast) counter = 'All set';

  const nextLabel = isLast ? (t.replay && step.nextReplay ? step.nextReplay : step.next) : step.next || 'Next';

  const dots = el(
    'div.tour-dots',
    { 'aria-hidden': 'true' },
    STEPS.map((_, i) => el(`span.tour-dot${i === t.index ? '.active' : ''}`))
  );

  const nextBtn = el('button.btn.btn-primary', { type: 'button', onClick: guard(t, () => next(t)) }, nextLabel);
  const backBtn = el('button.btn.btn-ghost', { type: 'button', onClick: guard(t, () => back(t)) }, 'Back');

  t.card.className = `tour-card${centered ? ' tour-card--center' : ''}`;
  while (t.card.firstChild) t.card.removeChild(t.card.firstChild);
  t.arrow = el('div.tour-arrow');

  // Node.append() turns a null argument into the literal text "null", so
  // optional pieces are filtered out first.
  const pieces = [
    el(
      'div.tour-head',
      el('span.tour-count', counter),
      isLast ? null : el('button.tour-skip', { type: 'button', onClick: guard(t, () => end(t)) }, 'Skip tour')
    ),
    step.art ? el('div.tour-art', { 'aria-hidden': 'true' }, step.art) : null,
    el('h2.tour-title#tour-title', step.icon ? icon(step.icon, 22) : null, step.title),
    el('p.tour-body#tour-body', step.body),
    centered
      ? el('div', dots, el('div.tour-actions', t.index > 0 ? backBtn : null, nextBtn))
      : el('div.tour-actions', dots, el('div', { style: 'display:flex;gap:8px;' }, t.index > 1 ? backBtn : null, nextBtn)),
    centered ? null : el('p.tour-hint', 'Tip: selecting the highlighted tab also continues.'),
    t.arrow,
  ];
  t.card.append(...pieces.filter(Boolean));
}

// The nav is re-mounted on every route change (app.js render()), so the tab
// element has to be looked up fresh each time; wait briefly for the new page
// and nav to be in place before measuring.
function placeWhenReady(t, tries) {
  if (active !== t) return;
  const step = STEPS[t.index];
  if (step.tab != null && tries < 10) {
    const tabEl = document.querySelectorAll(NAV_TAB_SELECTOR)[step.tab];
    if (!tabEl || !tabEl.classList.contains('active')) {
      t.retryTimer = setTimeout(guard(t, () => placeWhenReady(t, tries + 1)), 60);
      return;
    }
  }
  place(t);
  const nextBtn = t.card.querySelector('.btn-primary');
  if (nextBtn) nextBtn.focus({ preventScroll: true });
}

function place(t) {
  if (active !== t) return;
  const step = STEPS[t.index];
  const card = t.card;

  if (step.tab == null) {
    t.spot.classList.remove('on');
    t.scrim.classList.add('on');
    card.style.left = '';
    card.style.top = '';
    card.style.width = '';
    t.arrow.className = 'tour-arrow';
    return;
  }

  const tabEl = document.querySelectorAll(NAV_TAB_SELECTOR)[step.tab];
  if (!tabEl) {
    // Nav isn't there (e.g. the app hit its crash screen): fall back to a centered card.
    t.spot.classList.remove('on');
    t.scrim.classList.add('on');
    return;
  }

  const rect = tabEl.getBoundingClientRect();
  const pad = 4;
  t.scrim.classList.remove('on');
  Object.assign(t.spot.style, {
    left: `${rect.left - pad}px`,
    top: `${rect.top - pad}px`,
    width: `${rect.width + pad * 2}px`,
    height: `${rect.height + pad * 2}px`,
  });
  t.spot.classList.add('on');

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const desktop = vw >= DESKTOP_MIN_WIDTH;
  card.classList.remove('tour-card--center');

  if (desktop) {
    const width = 360;
    card.style.width = `${width}px`;
    card.style.left = `${Math.min(rect.right + pad + 16, vw - width - 12)}px`;
    card.style.top = '0px';
    const height = card.offsetHeight;
    const top = Math.max(12, Math.min(rect.top + rect.height / 2 - height / 2, vh - height - 12));
    card.style.top = `${top}px`;
    t.arrow.className = 'tour-arrow tour-arrow--left';
    t.arrow.style.left = '';
    t.arrow.style.top = `${rect.top + rect.height / 2 - top - 7}px`;
  } else {
    const shell = document.querySelector('.app-shell');
    const shellRect = shell ? shell.getBoundingClientRect() : { left: 0, right: vw, width: vw };
    const width = Math.min(400, shellRect.width - 24);
    card.style.width = `${width}px`;
    const centerX = rect.left + rect.width / 2;
    const left = Math.max(shellRect.left + 12, Math.min(centerX - width / 2, shellRect.right - width - 12));
    card.style.left = `${left}px`;
    card.style.top = '0px';
    const height = card.offsetHeight;
    card.style.top = `${Math.max(12, rect.top - pad - height - 16)}px`;
    t.arrow.className = 'tour-arrow tour-arrow--down';
    t.arrow.style.top = '';
    t.arrow.style.left = `${centerX - left - 7}px`;
  }
}
