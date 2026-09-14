// Etymon — derived/computed views over the store's raw state.

import { ROOTS, getRoot, rootWordOrder } from '../data/roots.js';
import { dueWordsForRoot, rootMastery, treeHealth } from './srs.js';
import { plantedRoots } from './storage.js';

/** Every planted root's due words, flattened, newest-planted last. */
export function allDueWords(state) {
  const out = [];
  for (const root of plantedRoots(state)) {
    for (const wordId of dueWordsForRoot(root, state.wordStats)) {
      out.push({ rootId: root.id, wordId });
    }
  }
  return out;
}

/** The next unlearned word in a root's learning order, or null if fully learned. */
export function nextUnlearnedWord(state, rootId) {
  const root = getRoot(rootId);
  const order = rootWordOrder(root);
  return order.find((id) => !state.wordStats[id]?.learned) ?? null;
}

/** A single, calm "what should I do next" suggestion for the Home screen. */
export function suggestedAction(state) {
  const due = allDueWords(state);
  if (due.length > 0) {
    return { type: 'review', count: due.length };
  }
  const planted = plantedRoots(state);
  for (const root of planted) {
    if (nextUnlearnedWord(state, root.id)) {
      return { type: 'learn', rootId: root.id };
    }
  }
  if (planted.length === 0) {
    return { type: 'plant' };
  }
  return { type: 'explore' };
}

export function forestSummary(state) {
  const planted = plantedRoots(state);
  const totalWordsLearned = Object.values(state.wordStats).filter((w) => w.learned).length;
  const avgHealth = planted.length
    ? Math.round(planted.reduce((sum, r) => sum + treeHealth(r, state.wordStats), 0) / planted.length)
    : 100;
  return {
    treesPlanted: planted.length,
    treesCompleted: state.stats.treesCompleted,
    totalWordsLearned,
    avgHealth,
    dueCount: allDueWords(state).length,
  };
}

export function rootStats(state, rootId) {
  const root = getRoot(rootId);
  return {
    mastery: rootMastery(root, state.wordStats),
    health: treeHealth(root, state.wordStats),
    dueWords: dueWordsForRoot(root, state.wordStats),
    stage: state.progress[rootId]?.stage ?? 'seed',
  };
}

/**
 * "Constellation" links — words that appear in more than one root family,
 * the visual proof that vocabulary is a connected web, not isolated lists.
 */
export function sharedWordRootIds(wordId) {
  return ROOTS.filter((r) => rootWordOrder(r).includes(wordId)).map((r) => r.id);
}

export function allSharedWords() {
  const counts = new Map();
  for (const root of ROOTS) {
    for (const id of rootWordOrder(root)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id);
}

/**
 * Every root a given root forms a two-(or-more-)root word with, e.g.
 * rootBridgePartners('dict') -> [{ rootId: 'bene', wordId: 'benediction' }].
 * Used to teach the "roots combine" idea directly on the root's own card,
 * independent of which roots happen to be planted right now.
 */
export function rootBridgePartners(rootId) {
  const out = [];
  for (const wordId of allSharedWords()) {
    const owners = sharedWordRootIds(wordId);
    if (!owners.includes(rootId)) continue;
    for (const otherId of owners) {
      if (otherId !== rootId) out.push({ rootId: otherId, wordId });
    }
  }
  return out;
}

/**
 * Bridge words where at least 2 of the parent roots are both currently
 * planted — these are the ones with a real branch to draw between two
 * live trees in the Forest scene. Returns { wordId, rootIds } where
 * rootIds is restricted to the planted subset (still >= 2).
 */
export function forestBridges(state) {
  const plantedIds = new Set(plantedRoots(state).map((r) => r.id));
  const out = [];
  for (const wordId of allSharedWords()) {
    const rootIds = sharedWordRootIds(wordId).filter((id) => plantedIds.has(id));
    if (rootIds.length > 1) out.push({ wordId, rootIds });
  }
  return out;
}

// ---- Tier progression ----
// Beginner roots are open from the start. Intermediate and Advanced roots
// unlock once enough lower-tier trees are well underway — a gentle curve so
// a newcomer isn't shown all 20+ roots at once, matching the brief's "whether
// a seed can be planted" requirement in the Seed Library.
const STAGE_RANK = { seed: 0, sprout: 1, trunk: 2, branches: 3, leaves: 4, flowering: 5, complete: 6 };
const UNLOCK_REQUIREMENT = { Beginner: null, Intermediate: { tier: 'Beginner', count: 2 }, Advanced: { tier: 'Intermediate', count: 2 } };
const LEAFED_RANK = STAGE_RANK.leaves;

function rootsAtTier(tier) {
  return ROOTS.filter((r) => r.tier === tier);
}

function isRootDeveloped(state, root) {
  const stage = state.progress[root.id]?.stage;
  return (STAGE_RANK[stage] ?? 0) >= LEAFED_RANK;
}

export function isRootUnlocked(state, root) {
  const requirement = UNLOCK_REQUIREMENT[root.tier];
  if (!requirement) return true;
  const developedCount = rootsAtTier(requirement.tier).filter((r) => isRootDeveloped(state, r)).length;
  return developedCount >= requirement.count;
}

export function unlockHint(state, root) {
  const requirement = UNLOCK_REQUIREMENT[root.tier];
  if (!requirement) return '';
  const developedCount = rootsAtTier(requirement.tier).filter((r) => isRootDeveloped(state, r)).length;
  const remaining = Math.max(0, requirement.count - developedCount);
  return `Grow ${remaining} more ${requirement.tier} tree${remaining === 1 ? '' : 's'} to "leafing" or beyond to unlock.`;
}
