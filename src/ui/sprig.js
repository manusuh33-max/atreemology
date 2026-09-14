import { el } from './dom.js';

/**
 * Sprig — the small companion sprite that narrates gently. Purely optional
 * flavor: it never blocks an action and is hidden entirely in Calm Mode.
 */
export function renderSprig(message, { calmMode = false } = {}) {
  if (calmMode || !message) return null;
  return el(
    'div.sprig',
    { role: 'status' },
    el('span.sprig-orb', '✨'),
    el('p.sprig-text', message)
  );
}

const GREETINGS = {
  morning: [
    "Morning light in the forest — a good time to learn something new.",
    'The dew is still on the leaves. Ready when you are.',
  ],
  due: (n) => `${n} word${n === 1 ? '' : 's'} would love a quick visit today.`,
  streak: (n) => `${n} day streak. The forest remembers.`,
  empty: "No trees planted yet — the Seed Library is full of good ones.",
  allCaughtUp: 'Everything is tended. The forest is calm right now.',
  quizCorrect: ["Exactly right.", 'That one\'s yours now.', 'Nicely spotted.'],
  quizWrong: ["Close — here's the connection.", "Not quite, but now you'll remember it.", 'That one\'s tricky. Look at the root.'],
  planted: (root) => `${/^[aeiou]/i.test(root) ? 'An' : 'A'} ${root} seed, planted. It starts underground, out of sight.`,
  completed: (title) => `Tree complete! "${title}" is yours.`,
};

export function sprigLine(key, arg) {
  const v = GREETINGS[key];
  if (typeof v === 'function') return v(arg);
  if (Array.isArray(v)) return v[Math.floor(Math.random() * v.length)];
  return v;
}
