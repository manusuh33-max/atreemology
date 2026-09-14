// Etymon — spaced repetition + growth-stage logic
// A deliberately simple, transparent scheduler (v1, matches the product brief):
//   again  -> due tomorrow,   mastery -15
//   hard   -> due in 3 days,  mastery  +5
//   good   -> due in 7 days,  mastery +15
//   easy   -> due in 14 days, mastery +25
// Mastery is clamped to [0, 100]. Nothing here is punitive — the worst outcome
// is "see it again sooner," never a lost streak or a lost tree.

export const INTERVALS = { again: 1, hard: 3, good: 7, easy: 14 };
export const MASTERY_DELTA = { again: -15, hard: 5, good: 15, easy: 25 };

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function isDue(wordStat, now = new Date()) {
  if (!wordStat || !wordStat.dueAt) return true;
  return new Date(wordStat.dueAt).getTime() <= now.getTime();
}

/**
 * Apply a review rating to a single word's stats.
 * @param {object} stat current per-word stat (mutated copy is returned, not mutated in place)
 * @param {'again'|'hard'|'good'|'easy'} rating
 */
export function reviewWord(stat, rating) {
  const prevMastery = stat?.mastery ?? 0;
  const nextMastery = clamp(prevMastery + MASTERY_DELTA[rating], 0, 100);
  const intervalDays = INTERVALS[rating];
  const dueAt = addDays(new Date(), intervalDays).toISOString();
  return {
    ...stat,
    mastery: nextMastery,
    intervalDays,
    dueAt,
    reviews: (stat?.reviews ?? 0) + 1,
    learned: true,
    lastResult: rating,
    lastReviewedAt: new Date().toISOString(),
  };
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Derive a root's overall stage from its words' learned/mastery state.
 * Stages: seed -> sprout -> trunk -> branches -> leaves -> flowering -> complete
 */
export function deriveStage(root, wordStats) {
  const learnedIn = (ids) => ids.filter((id) => wordStats[id]?.learned).length;
  const connectorLearned = learnedIn(root.connectorWordIds);
  const commonLearned = learnedIn(root.commonWordIds);
  const advancedLearned = learnedIn(root.advancedWordIds);
  const allWords = [...root.connectorWordIds, ...root.commonWordIds, ...root.advancedWordIds];
  const avgMastery = average(allWords.map((id) => wordStats[id]?.mastery ?? 0));

  // A prefix-only root can have empty common/advanced tiers (it has no
  // "complex vocabulary" of its own beyond its bridge words) — treat an
  // empty tier as already satisfied rather than a permanent gate.
  const connectorDone = root.connectorWordIds.length === 0 || connectorLearned === root.connectorWordIds.length;
  const commonDone = root.commonWordIds.length === 0 || commonLearned === root.commonWordIds.length;
  const advancedDone = root.advancedWordIds.length === 0 || advancedLearned === root.advancedWordIds.length;

  if (connectorLearned === 0 && root.connectorWordIds.length > 0) return 'seed';
  if (!connectorDone) return 'sprout';
  if (commonLearned === 0 && root.commonWordIds.length > 0) return 'trunk';
  if (!commonDone) return 'branches';
  if (advancedLearned === 0 && root.advancedWordIds.length > 0) return 'leaves';
  if (!advancedDone || avgMastery < 70) return 'flowering';
  return 'complete';
}

export function average(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Root-level mastery: the average mastery across every word in the family. */
export function rootMastery(root, wordStats) {
  const allWords = [...root.connectorWordIds, ...root.commonWordIds, ...root.advancedWordIds];
  return Math.round(average(allWords.map((id) => wordStats[id]?.mastery ?? 0)));
}

/** Words in a root that are due for review right now. */
export function dueWordsForRoot(root, wordStats, now = new Date()) {
  const allWords = [...root.connectorWordIds, ...root.commonWordIds, ...root.advancedWordIds];
  return allWords.filter((id) => wordStats[id]?.learned && isDue(wordStats[id], now));
}

/**
 * Tree "health" — a calm, never-shaming read on how tended a tree is.
 * Starts at 100 and dips a little per overdue word, floors at 35 so a
 * neglected tree always looks reviveable, never dead.
 */
export function treeHealth(root, wordStats, now = new Date()) {
  const learnedWords = [...root.connectorWordIds, ...root.commonWordIds, ...root.advancedWordIds]
    .filter((id) => wordStats[id]?.learned);
  if (learnedWords.length === 0) return 100;
  const overdueCount = learnedWords.filter((id) => isDue(wordStats[id], now)).length;
  const ratio = overdueCount / learnedWords.length;
  return Math.max(35, Math.round(100 - ratio * 65));
}

export function healthLabel(health) {
  if (health >= 90) return { label: 'Thriving', tone: 'thriving' };
  if (health >= 70) return { label: 'Content', tone: 'content' };
  if (health >= 50) return { label: 'A little thirsty', tone: 'thirsty' };
  return { label: 'Misty — could use a visit', tone: 'misty' };
}
