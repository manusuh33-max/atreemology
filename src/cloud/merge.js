// Atreemology — merging two copies of a learner's progress.
//
// The same learner can have progress on this device and in their account. This
// module combines two copies WITHOUT ever losing learning: every rule below
// keeps the "further along" value. It is pure (no DOM, no network) so it can be
// tested on its own, and it is symmetric: merge(a, b) equals merge(b, a), and
// merging the same pair twice changes nothing.
//
// The state shape is the one in state/storage.js (version 1).
//
// One deliberate exception to "furthest along wins": the cosmetic profile
// settings (name, calm mode, theme) follow whichever copy was used most
// recently. That choice is order-independent for any two copies; it is not
// strictly associative across three, which is harmless for three cosmetic fields.

const STAGE_RANK = { seed: 0, sprout: 1, trunk: 2, branches: 3, leaves: 4, flowering: 5, complete: 6 };
const MAX_JOURNAL = 200;
const MAX_QUIZ_HISTORY = 60;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export function isValidState(s) {
  return isObj(s) && s.version === 1;
}

/** Fill in any missing top-level pieces so merging never trips on an old save. */
export function normalizeState(s) {
  const x = isObj(s) ? s : {};
  return {
    ...x,
    version: 1,
    onboarded: Boolean(x.onboarded),
    profile: {
      name: '',
      calmMode: false,
      supporter: false,
      supporterTheme: false,
      supporterSince: null,
      ...(isObj(x.profile) ? x.profile : {}),
    },
    streak: { current: 0, longest: 0, lastActiveDate: null, ...(isObj(x.streak) ? x.streak : {}) },
    progress: isObj(x.progress) ? x.progress : {},
    wordStats: isObj(x.wordStats) ? x.wordStats : {},
    journal: Array.isArray(x.journal) ? x.journal : [],
    rewardsClaimed: Array.isArray(x.rewardsClaimed) ? x.rewardsClaimed : [],
    quizHistory: Array.isArray(x.quizHistory) ? x.quizHistory : [],
    stats: { treesCompleted: 0, totalReviews: 0, ...(isObj(x.stats) ? x.stats : {}) },
  };
}

/** Stable JSON (sorted keys) so two equal states always compare equal. */
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isObj(value)) {
    return `{${Object.keys(value)
      .sort()
      .filter((k) => value[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value === undefined ? null : value);
}

export function statesEqual(a, b) {
  if (!a || !b) return false;
  return canonical(normalizeState(a)) === canonical(normalizeState(b));
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const minIso = (a, b) => (!a ? b : !b ? a : a <= b ? a : b);
const maxIso = (a, b) => (!a ? b : !b ? a : a >= b ? a : b);

/** Deterministic pick between two records: first by `cmp`, then by their text. */
function pick(a, b, cmp) {
  const c = cmp(a, b);
  if (c !== 0) return c > 0 ? a : b;
  return canonical(a) >= canonical(b) ? a : b;
}

function mergeWordStat(a, b) {
  if (!a) return b;
  if (!b) return a;
  const best = pick(a, b, (x, y) => {
    const r = num(x.reviews) - num(y.reviews);
    if (r !== 0) return r;
    const t = String(x.lastReviewedAt || '').localeCompare(String(y.lastReviewedAt || ''));
    if (t !== 0) return t;
    return num(x.mastery) - num(y.mastery);
  });
  return { ...best, reviews: Math.max(num(a.reviews), num(b.reviews)), learned: Boolean(a.learned || b.learned) };
}

function mergeProgressRecord(a, b) {
  if (!a) return b;
  if (!b) return a;
  const best = pick(a, b, (x, y) => num(x.reviews) - num(y.reviews));
  const rankA = STAGE_RANK[a.stage] ?? -1;
  const rankB = STAGE_RANK[b.stage] ?? -1;
  return {
    ...best,
    plantedAt: minIso(a.plantedAt, b.plantedAt),
    // A tree never un-grows: keep whichever copy is further along.
    stage: rankA === rankB ? best.stage : rankA > rankB ? a.stage : b.stage,
    reviews: Math.max(num(a.reviews), num(b.reviews)),
  };
}

function unionBy(listA, listB, keyOf) {
  const seen = new Map();
  for (const item of [...listA, ...listB]) {
    const key = keyOf(item);
    if (!seen.has(key)) seen.set(key, item);
    else if (canonical(item) > canonical(seen.get(key))) seen.set(key, item);
  }
  return [...seen.values()];
}

function mergeStreak(a, b) {
  const la = a.lastActiveDate || '';
  const lb = b.lastActiveDate || '';
  let current;
  let lastActiveDate;
  if (la === lb) {
    current = Math.max(num(a.current), num(b.current));
    lastActiveDate = a.lastActiveDate || b.lastActiveDate || null;
  } else if (la > lb) {
    current = num(a.current);
    lastActiveDate = a.lastActiveDate;
  } else {
    current = num(b.current);
    lastActiveDate = b.lastActiveDate;
  }
  return { current, longest: Math.max(num(a.longest), num(b.longest), current), lastActiveDate };
}

/** Which copy was in use most recently — its settings (name, calm mode, theme) win. */
function moreRecent(a, b) {
  const la = a.streak.lastActiveDate || '';
  const lb = b.streak.lastActiveDate || '';
  if (la !== lb) return la > lb ? a : b;
  const ra = num(a.stats.totalReviews);
  const rb = num(b.stats.totalReviews);
  if (ra !== rb) return ra > rb ? a : b;
  return canonical(a) >= canonical(b) ? a : b;
}

export function mergeStates(rawA, rawB) {
  const a = normalizeState(rawA);
  const b = normalizeState(rawB);
  const recent = moreRecent(a, b);
  const other = recent === a ? b : a;

  const profile = {
    ...other.profile,
    ...recent.profile,
    name: recent.profile.name || other.profile.name || '',
    supporter: Boolean(a.profile.supporter || b.profile.supporter),
    supporterSince: minIso(a.profile.supporterSince, b.profile.supporterSince) || null,
  };
  // The golden theme follows the copy used most recently, but only for supporters.
  profile.supporterTheme =
    profile.supporter && Boolean(recent.profile.supporter ? recent.profile.supporterTheme : other.profile.supporterTheme);

  const progress = {};
  for (const id of new Set([...Object.keys(a.progress), ...Object.keys(b.progress)])) {
    progress[id] = mergeProgressRecord(a.progress[id], b.progress[id]);
  }
  const wordStats = {};
  for (const id of new Set([...Object.keys(a.wordStats), ...Object.keys(b.wordStats)])) {
    wordStats[id] = mergeWordStat(a.wordStats[id], b.wordStats[id]);
  }

  const journal = unionBy(a.journal, b.journal, (e) => e.id ?? canonical(e))
    .sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')) || String(y.id || '').localeCompare(String(x.id || '')))
    .slice(0, MAX_JOURNAL);

  const rewardsClaimed = [...new Set([...a.rewardsClaimed, ...b.rewardsClaimed])].sort();
  const quizHistory = [...new Set([...b.quizHistory, ...a.quizHistory])].sort().slice(-MAX_QUIZ_HISTORY);
  const completeCount = Object.values(progress).filter((p) => p && p.stage === 'complete').length;

  return {
    ...other,
    ...recent,
    version: 1,
    onboarded: Boolean(a.onboarded || b.onboarded),
    profile,
    streak: mergeStreak(a.streak, b.streak),
    progress,
    wordStats,
    journal,
    rewardsClaimed,
    quizHistory,
    stats: {
      ...other.stats,
      ...recent.stats,
      treesCompleted: Math.max(num(a.stats.treesCompleted), num(b.stats.treesCompleted), completeCount),
      totalReviews: Math.max(num(a.stats.totalReviews), num(b.stats.totalReviews)),
    },
  };
}
