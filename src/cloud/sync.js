// Atreemology — keeping progress in step between this device and the learner's account.
//
// Local-first: the app always reads and writes this device's copy; the cloud
// copy is a backup that other devices can pick up. Two copies are combined with
// merge.js (nothing learned is ever lost), never overwritten.
//
// Timeline
//   before the app boots  -> syncBeforeBoot(): pull the cloud copy, merge it into
//                            this device's saved state, THEN let the app load.
//   while the app runs    -> startLiveSync(): after changes, push the merged copy
//                            (debounced). Offline? it is marked dirty and retried.
//   on sign-in            -> syncAfterSignIn(): merge both ways; reload once if the
//                            device picked up new progress.

import { KEYS, cloudEnabled, lsGet, lsSet, lsRemove } from './config.js?v=1';
import { api, currentUser, isSignedIn, onSessionChange, clearSessionLocally } from './session.js?v=1';
import { mergeStates, statesEqual, isValidState, normalizeState } from './merge.js?v=1';

// ---- small persisted bookkeeping: when we last synced and whether changes are waiting ----

function readMeta() {
  try {
    const m = JSON.parse(lsGet(KEYS.meta) || '{}');
    return { lastSyncAt: Number(m.lastSyncAt) || 0, dirty: Boolean(m.dirty), userId: m.userId || null };
  } catch {
    return { lastSyncAt: 0, dirty: false, userId: null };
  }
}
let meta = readMeta();
function setMeta(patch) {
  meta = { ...meta, ...patch };
  lsSet(KEYS.meta, JSON.stringify(meta));
}

// ---- status for the UI ----

const status = { state: 'idle', lastSyncAt: meta.lastSyncAt, remoteNewer: false };
const statusListeners = new Set();
function setStatus(patch) {
  Object.assign(status, patch);
  statusListeners.forEach((fn) => {
    try {
      fn({ ...status });
    } catch {
      /* ignore */
    }
  });
}
export const getSyncStatus = () => ({ ...status });
export function onSyncStatus(fn) {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
}

// ---- reading this device's saved state ----

export function readLocalState() {
  try {
    const parsed = JSON.parse(lsGet(KEYS.state) || 'null');
    return isValidState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ---- talking to the progress table ----

async function fetchRemote(signal) {
  const user = currentUser();
  if (!user) throw new Error('signed-out');
  const res = await api(`/rest/v1/progress?select=state,updated_at&user_id=eq.${encodeURIComponent(user.id)}`, { signal });
  if (!res.ok) throw new Error(`progress read failed (${res.status})`);
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function writeLocalState(state) {
  return lsSet(KEYS.state, JSON.stringify(state));
}

// ---- 1. before the app boots ----

/**
 * Pull the cloud copy and merge it into this device's saved state. Waits at most
 * `timeoutMs` so a slow connection never delays opening the app; a pull that
 * finishes late is thrown away (and the normal push-after-boot merges it later).
 */
export async function syncBeforeBoot({ timeoutMs = 2500 } = {}) {
  if (!cloudEnabled() || !isSignedIn()) return { changed: false };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { changed: false, offline: true };

  let abandoned = false;
  const work = (async () => {
    try {
      const row = await fetchRemote();
      if (abandoned) return { changed: false };
      const local = readLocalState();
      if (!row) {
        // Nothing in the cloud yet: push this device's copy once the app is up.
        setMeta({ dirty: Boolean(local) });
        return { changed: false };
      }
      if (!isValidState(row.state)) return { changed: false };
      const merged = local ? mergeStates(local, row.state) : normalizeState(row.state);
      const changed = !local || !statesEqual(merged, local);
      if (changed && !abandoned) writeLocalState(merged);
      setMeta({ dirty: !statesEqual(merged, row.state), lastSyncAt: Date.now() });
      setStatus({ lastSyncAt: meta.lastSyncAt });
      return { changed };
    } catch {
      return { changed: false, offline: true };
    }
  })();

  const result = await withTimeout(work, timeoutMs);
  if (result && result.timedOut) {
    abandoned = true;
    return { changed: false, timedOut: true };
  }
  return result;
}

// ---- 2. while the app runs ----

let store = null;
let pushTimer = null;
let pushing = null;
let rerunAfter = false;

function currentLocal() {
  return store ? store.getState() : readLocalState();
}

/** One round: read the cloud copy, merge, write back only if it would change. */
async function attemptPush() {
  const user = currentUser();
  if (!user) return 'signed-out';
  const local = currentLocal();
  if (!local) return 'nothing';
  const row = await fetchRemote();

  if (row && isValidState(row.state)) {
    const merged = mergeStates(local, row.state);
    setStatus({ remoteNewer: !statesEqual(merged, local) });
    if (statesEqual(merged, row.state)) return 'unchanged';
    // Write only if nobody else wrote since we read, so two devices can't overwrite each other.
    const res = await api(
      `/rest/v1/progress?user_id=eq.${encodeURIComponent(user.id)}&updated_at=eq.${encodeURIComponent(row.updated_at)}`,
      { method: 'PATCH', body: { state: merged }, headers: { Prefer: 'return=representation' } }
    );
    if (!res.ok) throw new Error(`progress write failed (${res.status})`);
    const rows = await res.json();
    return Array.isArray(rows) && rows.length ? 'written' : 'conflict';
  }

  const res = await api('/rest/v1/progress', {
    method: 'POST',
    body: { user_id: user.id, state: normalizeState(local) },
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
  });
  if (!res.ok) throw new Error(`progress insert failed (${res.status})`);
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? 'written' : 'conflict';
}

export function pushNow() {
  if (!cloudEnabled() || !isSignedIn()) return Promise.resolve(false);
  if (pushing) {
    rerunAfter = true;
    return pushing;
  }
  setStatus({ state: 'syncing' });
  pushing = (async () => {
    try {
      let outcome = 'conflict';
      for (let i = 0; i < 4 && outcome === 'conflict'; i++) outcome = await attemptPush();
      if (outcome === 'conflict') throw new Error('too many conflicts');
      setMeta({ dirty: false, lastSyncAt: Date.now() });
      setStatus({ state: 'idle', lastSyncAt: meta.lastSyncAt });
      return true;
    } catch (err) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      setStatus({ state: offline || err instanceof TypeError ? 'offline' : 'error' });
      return false;
    } finally {
      pushing = null;
      if (rerunAfter) {
        rerunAfter = false;
        schedulePush(1500);
      }
    }
  })();
  return pushing;
}

function schedulePush(ms = 4000) {
  if (!isSignedIn()) return;
  if (!meta.dirty) setMeta({ dirty: true });
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushNow(), ms);
}

let started = false;

/** Call once after the app has booted. Safe to call when cloud features are off. */
export async function startLiveSync() {
  if (started || !cloudEnabled()) return;
  started = true;
  try {
    store = await import('../state/store.js');
  } catch {
    store = null;
  }
  if (store) store.subscribe(() => schedulePush());
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      // Leaving the tab: flush now rather than wait for the debounce.
      if (document.visibilityState === 'hidden' && meta.dirty && isSignedIn()) {
        clearTimeout(pushTimer);
        pushNow();
      }
    });
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      if (isSignedIn() && meta.dirty) pushNow();
    });
  }
  onSessionChange((s) => {
    if (!s) setStatus({ state: 'idle', remoteNewer: false });
  });
  // Seed the cloud on first run, or flush changes that were waiting from last time.
  if (isSignedIn() && (meta.dirty || !meta.lastSyncAt)) schedulePush(600);
}

// ---- 3. right after signing in ----

/**
 * Merge both ways straight after a successful sign-in. If this device picked up
 * progress it did not have, it is saved and the caller should reload once so the
 * app loads it. Returns { reload: boolean }.
 */
export async function syncAfterSignIn() {
  const user = currentUser();
  if (!user) return { reload: false };
  if (meta.userId && meta.userId !== user.id) setMeta({ lastSyncAt: 0, dirty: true }); // a different account than before
  setMeta({ userId: user.id });
  try {
    const row = await fetchRemote();
    const local = currentLocal();
    if (row && isValidState(row.state)) {
      const merged = local ? mergeStates(local, row.state) : normalizeState(row.state);
      if (!local || !statesEqual(merged, local)) {
        writeLocalState(merged);
        setMeta({ dirty: !statesEqual(merged, row.state), lastSyncAt: Date.now() });
        return { reload: true };
      }
    }
    setMeta({ dirty: true });
    await pushNow();
    return { reload: false };
  } catch {
    setMeta({ dirty: true });
    setStatus({ state: 'offline' });
    return { reload: false, offline: true };
  }
}

// ---- reset and delete ----

/** Remove this account's cloud copy of progress. Returns false only if it exists and could not be removed. */
export async function deleteCloudProgress() {
  const user = currentUser();
  if (!user || !cloudEnabled()) return true;
  try {
    const res = await api(`/rest/v1/progress?user_id=eq.${encodeURIComponent(user.id)}`, { method: 'DELETE' });
    if (!res.ok) return false;
    setMeta({ dirty: false });
    return true;
  } catch {
    return false;
  }
}

/** Used by "Reset all progress": clear the cloud copy first so signing in later can't merge old progress back. */
export async function resetCloudCopy() {
  if (!cloudEnabled() || !isSignedIn()) return true;
  return deleteCloudProgress();
}

/** Delete the account and everything stored for it. Progress on this device stays. */
export async function deleteAccount() {
  if (!cloudEnabled() || !isSignedIn()) return false;
  try {
    const res = await api('/functions/v1/delete-account', { method: 'POST', body: {} });
    if (!res.ok) return false;
  } catch {
    return false;
  }
  clearSessionLocally();
  lsRemove(KEYS.meta);
  meta = { lastSyncAt: 0, dirty: false, userId: null };
  setStatus({ state: 'idle', lastSyncAt: 0, remoteNewer: false });
  return true;
}

export function markFlash(message) {
  try {
    sessionStorage.setItem(KEYS.flash, message);
  } catch {
    /* ignore */
  }
}

export function takeFlash() {
  try {
    const m = sessionStorage.getItem(KEYS.flash);
    if (m) sessionStorage.removeItem(KEYS.flash);
    return m;
  } catch {
    return null;
  }
}
