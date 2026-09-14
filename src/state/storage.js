// Atreemology — persistence layer
// Everything lives under one localStorage key so it is easy to inspect,
// export, or later swap for a real backend (see README "next steps").

import { ROOTS } from '../data/roots.js';
import { todayStr } from './srs.js';

export const STORAGE_KEY = 'atreemology:v1:state';

function defaultState() {
  return {
    version: 1,
    onboarded: false,
    profile: {
      name: '',
      calmMode: false,
      supporter: false,
      supporterTheme: false,
      supporterSince: null,
    },
    streak: {
      current: 0,
      longest: 0,
      lastActiveDate: null,
    },
    progress: {}, // rootId -> { plantedAt, stage, reviews }
    wordStats: {}, // wordId -> { mastery, dueAt, intervalDays, reviews, learned, lastResult }
    journal: [], // { id, date, text, rootId, wordId }
    rewardsClaimed: [], // rootId[]
    quizHistory: [], // recently-asked question keys, oldest first, capped — see quizGenerator.js
    stats: {
      treesCompleted: 0,
      totalReviews: 0,
    },
  };
}

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function loadState() {
  if (typeof localStorage === 'undefined') return defaultState();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultState();
  const parsed = safeParse(raw);
  if (!parsed || parsed.version !== 1) return defaultState();
  // shallow-merge onto defaults so new fields introduced later never crash old saves
  const base = defaultState();
  return {
    ...base,
    ...parsed,
    profile: { ...base.profile, ...parsed.profile },
    streak: { ...base.streak, ...parsed.streak },
    stats: { ...base.stats, ...parsed.stats },
  };
}

export function saveState(state) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  if (typeof localStorage === 'undefined') return defaultState();
  localStorage.removeItem(STORAGE_KEY);
  return defaultState();
}

/** Ensure a root has a progress record (used the moment a seed is planted). */
export function ensurePlanted(state, rootId) {
  if (state.progress[rootId]) return state;
  return {
    ...state,
    progress: {
      ...state.progress,
      [rootId]: {
        rootId,
        plantedAt: new Date().toISOString(),
        stage: 'seed',
        reviews: 0,
      },
    },
  };
}

export function isPlanted(state, rootId) {
  return Boolean(state.progress[rootId]);
}

export function plantedRoots(state) {
  return ROOTS.filter((r) => isPlanted(state, r.id));
}

/** Bump the daily streak — call once per app-open when the date has changed. */
export function touchStreak(state) {
  const today = todayStr();
  if (state.streak.lastActiveDate === today) return state;
  const yesterday = todayStr(new Date(Date.now() - 86400000));
  const continued = state.streak.lastActiveDate === yesterday;
  const current = state.streak.lastActiveDate ? (continued ? state.streak.current + 1 : 1) : 1;
  return {
    ...state,
    streak: {
      current,
      longest: Math.max(state.streak.longest, current),
      lastActiveDate: today,
    },
  };
}

/** Download the raw progress state as a JSON file the learner can keep. */
export async function exportProgress(state) {
  if (typeof document === 'undefined') return;
  const payload = { app: 'Atreemology', exportedAt: new Date().toISOString(), state };
  const json = JSON.stringify(payload, null, 2);
  const filename = `atreemology-progress-${todayStr()}.json`;

  // Inside a claude.ai Artifact preview, a plain anchor download does
  // nothing (the sandbox blocks it) — offer the file through the
  // viewer's own save flow instead when it's available.
  if (typeof window !== 'undefined' && window.claude && typeof window.claude.use === 'function') {
    try {
      const downloads = await window.claude.use('downloads');
      if (downloads) {
        await downloads.save({ filename, data: json });
        return;
      }
    } catch {
      // Fall through to the standalone-app download path below.
    }
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function addJournalEntry(state, entry) {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString(),
    ...entry,
  };
  const journal = [item, ...state.journal].slice(0, 200);
  return { ...state, journal };
}
