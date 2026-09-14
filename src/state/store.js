// Etymon — tiny app store: load -> mutate -> save -> notify.
// No framework needed at this scale; every screen re-renders itself on 'change'.

import { loadState, saveState, ensurePlanted, touchStreak, addJournalEntry, resetState } from './storage.js';
import { reviewWord as applyReview, deriveStage } from './srs.js';
import { getRoot } from '../data/roots.js';
import { getWord } from '../data/words.js';

let state = loadState();
state = touchStreak(state);
saveState(state);

const listeners = new Set();

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function commit(next) {
  state = next;
  saveState(state);
  listeners.forEach((fn) => fn(state));
}

function updateRootProgress(s, rootId) {
  const root = getRoot(rootId);
  const progress = s.progress[rootId];
  if (!root || !progress) return s;
  const stage = deriveStage(root, s.wordStats);
  const wasComplete = progress.stage === 'complete';
  const nowComplete = stage === 'complete';
  let next = {
    ...s,
    progress: { ...s.progress, [rootId]: { ...progress, stage } },
  };
  if (!wasComplete && nowComplete) {
    next = {
      ...next,
      stats: { ...next.stats, treesCompleted: next.stats.treesCompleted + 1 },
    };
  }
  return next;
}

// ---- actions ----

export function completeOnboarding(name) {
  commit({ ...state, onboarded: true, profile: { ...state.profile, name: name || state.profile.name } });
}

export function plantSeed(rootId) {
  let next = ensurePlanted(state, rootId);
  if (next === state) return; // already planted
  next = addJournalEntry(next, {
    text: `Planted a new seed: ${getRoot(rootId).root} — "${getRoot(rootId).meaning}."`,
    rootId,
  });
  commit(next);
}

/** Mark a word as introduced/learned without a formal review (used the first time a word is shown in a lesson). */
export function markWordSeen(rootId, wordId) {
  if (state.wordStats[wordId]?.learned) return;
  const word = getWord(wordId);
  let next = {
    ...state,
    wordStats: {
      ...state.wordStats,
      [wordId]: {
        mastery: 20,
        intervalDays: 1,
        dueAt: new Date(Date.now() + 86400000).toISOString(),
        reviews: 0,
        learned: true,
        lastResult: null,
      },
    },
  };
  next = addJournalEntry(next, {
    text: `Learned "${word.word}" — ${word.definition}`,
    rootId,
    wordId,
  });
  next = updateRootProgress(next, rootId);
  commit(next);
}

/** Submit an SRS rating for a word (from quiz or the review queue). */
export function reviewWordAction(rootId, wordId, rating) {
  const prevStat = state.wordStats[wordId];
  const nextStat = applyReview(prevStat, rating);
  let next = {
    ...state,
    wordStats: { ...state.wordStats, [wordId]: nextStat },
    stats: { ...state.stats, totalReviews: state.stats.totalReviews + 1 },
  };
  const progress = next.progress[rootId];
  if (progress) {
    next = {
      ...next,
      progress: { ...next.progress, [rootId]: { ...progress, reviews: (progress.reviews ?? 0) + 1 } },
    };
  }
  next = updateRootProgress(next, rootId);
  commit(next);
}

export function claimReward(rootId) {
  if (state.rewardsClaimed.includes(rootId)) return;
  let next = { ...state, rewardsClaimed: [...state.rewardsClaimed, rootId] };
  next = addJournalEntry(next, {
    text: `${getRoot(rootId).reward.icon} Completed the ${getRoot(rootId).root} tree and earned "${getRoot(rootId).reward.title}."`,
    rootId,
  });
  commit(next);
}

export function updateProfile(patch) {
  commit({ ...state, profile: { ...state.profile, ...patch } });
}

const MAX_QUIZ_HISTORY = 60;

/** Remember which quiz questions were just asked, so the next quiz (in this
 * root or across the forest) favors ones that haven't come up in a while
 * instead of repeating the same handful every time. */
export function recordQuizHistory(keys) {
  if (!keys || !keys.length) return;
  const withoutRepeats = state.quizHistory.filter((k) => !keys.includes(k));
  const quizHistory = [...withoutRepeats, ...keys].slice(-MAX_QUIZ_HISTORY);
  commit({ ...state, quizHistory });
}

export function resetAllProgress() {
  commit(resetState());
}
