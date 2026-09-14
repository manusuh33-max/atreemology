// Atreemology — cross-forest milestone badges. These sit alongside the per-root
// cosmetic rewards: rewards celebrate finishing one tree, achievements
// celebrate the shape of the whole forest over time.

/**
 * @typedef {Object} Achievement
 * @property {string} id
 * @property {string} icon
 * @property {string} label
 * @property {(summary: object, state: object) => boolean} isEarned
 */

/** @type {Achievement[]} */
export const ACHIEVEMENTS = [
  { id: 'first-root', icon: '🌱', label: 'First Root', isEarned: (s) => s.treesPlanted >= 1 },
  { id: 'first-review', icon: '💧', label: 'First Review', isEarned: (s, state) => state.stats.totalReviews >= 1 },
  { id: 'five-roots', icon: '🌿', label: 'Five Roots Planted', isEarned: (s) => s.treesPlanted >= 5 },
  { id: 'ten-roots', icon: '🌲', label: 'Ten Roots Planted', isEarned: (s) => s.treesPlanted >= 10 },
  { id: 'twenty-words', icon: '📖', label: 'Twenty Words Learned', isEarned: (s) => s.totalWordsLearned >= 20 },
  { id: 'fifty-words', icon: '📚', label: 'Fifty Words Learned', isEarned: (s) => s.totalWordsLearned >= 50 },
  { id: 'first-tree', icon: '🌳', label: 'First Tree Completed', isEarned: (s) => s.treesCompleted >= 1 },
  { id: 'three-day-streak', icon: '🔥', label: 'Three-Day Streak', isEarned: (s, state) => state.streak.longest >= 3 },
  { id: 'week-streak', icon: '🔥', label: 'Seven-Day Streak', isEarned: (s, state) => state.streak.longest >= 7 },
  { id: 'detective', icon: '🕵️', label: 'Root Detective', isEarned: (s, state) => Object.keys(state.progress).length >= 2 },
];

export function earnedAchievements(summary, state) {
  return ACHIEVEMENTS.map((a) => ({ ...a, earned: a.isEarned(summary, state) }));
}
