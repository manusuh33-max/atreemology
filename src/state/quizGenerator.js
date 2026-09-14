// Atreemology — builds a short, varied quiz from a learner's due/learned words.

import { ROOTS, getRoot, rootWordOrder } from '../data/roots.js';
import { getWord, WORDS } from '../data/words.js';
import { plantedRoots } from '../state/storage.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

function withoutId(arr, id) {
  return arr.filter((x) => x !== id);
}

function parseGraft(relationNote) {
  // Matches things like: de- ("down, fully") + scribere → ...
  const m = relationNote.match(/^([a-zA-Z]+-)\s*\(["“]([^"”]+)["”]\)\s*\+\s*([a-zàâeéèêiîoôuû]+)/);
  if (!m) return null;
  return { prefix: m[1], prefixMeaning: m[2], base: m[3] };
}

function rootMeaningQuestion(root, allRoots) {
  const distractors = sample(withoutId(allRoots.map((r) => r.meaning), root.meaning).filter((m) => m !== root.meaning), 3);
  const choices = shuffle([root.meaning, ...distractors]);
  return {
    type: 'rootMeaning',
    key: `rootMeaning:${root.id}`,
    prompt: `What does the root "${root.displayRoot}" mean?`,
    choices,
    answer: root.meaning,
    rootId: root.id,
    wordId: root.connectorWordIds[0],
    explain: `${root.displayRoot} comes from ${root.language} and means "${root.meaning}."`,
  };
}

function relatedWordQuestion(root, wordId, allWordIds) {
  const word = getWord(wordId);
  const otherWords = sample(withoutId(allWordIds, wordId), 3).map((id) => getWord(id).word);
  const choices = shuffle([word.word, ...otherWords]);
  return {
    type: 'relatedWord',
    key: `relatedWord:${root.id}:${wordId}`,
    prompt: `Which word grows from "${root.displayRoot}" (${root.meaning})?`,
    choices,
    answer: word.word,
    rootId: root.id,
    wordId,
    explain: word.relationNote,
  };
}

function defineWordQuestion(root, wordId, allWordIds) {
  const word = getWord(wordId);
  const distractors = sample(withoutId(allWordIds, wordId), 3).map((id) => getWord(id).definition);
  const choices = shuffle([word.definition, ...distractors]);
  return {
    type: 'defineWord',
    key: `defineWord:${root.id}:${wordId}`,
    prompt: `What does "${word.word}" mean?`,
    choices,
    answer: word.definition,
    rootId: root.id,
    wordId,
    explain: word.relationNote,
  };
}

function exampleFillQuestion(root, wordId, allWordIds) {
  const word = getWord(wordId);
  const blanked = word.example.replace(new RegExp(word.word, 'i'), '_____');
  if (blanked === word.example) return null; // couldn't blank it safely, skip
  const distractors = sample(withoutId(allWordIds, wordId), 3).map((id) => getWord(id).word);
  const choices = shuffle([word.word, ...distractors]);
  return {
    type: 'exampleFill',
    key: `exampleFill:${root.id}:${wordId}`,
    prompt: `Complete the sentence: "${blanked}"`,
    choices,
    answer: word.word,
    rootId: root.id,
    wordId,
    explain: word.relationNote,
  };
}

function graftQuestion(root, wordId, allWordIds) {
  const word = getWord(wordId);
  const parsed = parseGraft(word.relationNote);
  if (!parsed) return null;
  const distractors = sample(withoutId(allWordIds, wordId), 3).map((id) => getWord(id).word);
  const choices = shuffle([word.word, ...distractors]);
  return {
    type: 'graft',
    key: `graft:${root.id}:${wordId}`,
    prompt: `Graft it: ${parsed.prefix} ("${parsed.prefixMeaning}") + ${root.displayRoot} ("${root.meaning}") = ?`,
    choices,
    answer: word.word,
    rootId: root.id,
    wordId,
    explain: word.relationNote,
  };
}

function rootDetectiveQuestion(state, recentKeys) {
  const planted = plantedRoots(state);
  if (planted.length < 2) return null;
  const learnedPairs = [];
  for (const root of planted) {
    for (const id of rootWordOrder(root)) {
      if (state.wordStats[id]?.learned) learnedPairs.push({ rootId: root.id, wordId: id });
    }
  }
  if (learnedPairs.length < 2) return null;
  // Prefer a pair we haven't quizzed on recently; only fall back to a
  // recently-seen pair once every pair has been asked at least once.
  const unseen = learnedPairs.filter((p) => !recentKeys.has(`rootDetective:${p.rootId}:${p.wordId}`));
  const pick = sample(unseen.length ? unseen : learnedPairs, 1)[0];
  const word = getWord(pick.wordId);
  const root = getRoot(pick.rootId);
  const otherRootNames = sample(
    withoutId(planted.map((r) => r.id), root.id).map((id) => getRoot(id).root),
    Math.min(3, planted.length - 1)
  );
  const choices = shuffle([root.root, ...otherRootNames]);
  return {
    type: 'rootDetective',
    key: `rootDetective:${root.id}:${pick.wordId}`,
    prompt: `Root Detective: which of your planted roots does "${word.word}" grow from?`,
    choices,
    answer: root.root,
    rootId: root.id,
    wordId: pick.wordId,
    explain: word.relationNote,
  };
}

/**
 * Pick `length` questions out of `pool`, strongly preferring ones whose
 * `key` isn't in `recentKeys` (what the last several quiz sessions already
 * asked). Once the fresh supply runs out — a small, mostly-mastered root
 * only has so many possible questions — falls back to whichever questions
 * have gone the *longest* without being asked, so repeats are spread out
 * as much as possible instead of clustering on the same one or two.
 */
function pickVaried(pool, length, recentKeys, historyOrder) {
  const fresh = shuffle(pool.filter((q) => !recentKeys.has(q.key)));
  if (fresh.length >= length) return shuffle(fresh.slice(0, length));

  const stale = pool
    .filter((q) => recentKeys.has(q.key))
    .sort((a, b) => (historyOrder.get(a.key) ?? 0) - (historyOrder.get(b.key) ?? 0));

  const picked = [...fresh, ...stale.slice(0, length - fresh.length)];
  return shuffle(picked);
}

/**
 * Build a quiz session for one root (used from Root Detail's "Practice" button)
 * or across the whole forest (used from Home's "Review" action when count is null).
 */
export function buildQuiz(state, { rootId = null, length = 6 } = {}) {
  const allRoots = ROOTS;
  const allWordIds = Object.keys(WORDS);
  const pool = [];
  const recentKeys = new Set(state.quizHistory ?? []);

  const targetRoots = rootId ? [getRoot(rootId)] : plantedRoots(state);
  for (const root of targetRoots) {
    const learnedIds = rootWordOrder(root).filter((id) => state.wordStats[id]?.learned);
    if (learnedIds.length === 0) continue;
    pool.push(rootMeaningQuestion(root, allRoots));
    for (const wordId of learnedIds) {
      pool.push(relatedWordQuestion(root, wordId, allWordIds));
      pool.push(defineWordQuestion(root, wordId, allWordIds));
      const fill = exampleFillQuestion(root, wordId, allWordIds);
      if (fill) pool.push(fill);
      const graft = graftQuestion(root, wordId, allWordIds);
      if (graft) pool.push(graft);
    }
  }
  const detective = rootDetectiveQuestion(state, recentKeys);
  if (detective) pool.push(detective);

  if (pool.length <= length) return shuffle(pool);

  const historyOrder = new Map((state.quizHistory ?? []).map((key, i) => [key, i]));
  return pickVaried(pool, length, recentKeys, historyOrder);
}
