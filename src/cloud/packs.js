// Atreemology — premium root packs.
//
// The 26 Foundational Grove roots are bundled with the app and always free.
// Further root groups ("packs") live ONLY on the server: a pack's roots and
// words are handed out by a database function (get_pack_content) that checks the
// signed-in learner owns it. They are never part of the public JavaScript.
//
// A pack, once fetched, is cached on the device (IndexedDB) so it works offline
// and the learner keeps access to everything they have already learned.
//
// Pack content format (what supabase/packs/*.json files look like):
//   { "roots": [ <RootFamily as in data/roots.js> ... ],
//     "words": { "<wordId>": <Word as in data/words.js>, ... } }

import { cloudEnabled, KEYS, lsGet } from './config.js?v=1';
import { api, currentUser, isSignedIn, onSessionChange } from './session.js?v=1';
import { ROOTS, ROOTS_BY_ID } from '../data/roots.js';
import { WORDS } from '../data/words.js';

const TIERS = new Set(['Beginner', 'Intermediate', 'Advanced']);
const LEVELS = new Set(['connector', 'common', 'advanced']);
const isStr = (v) => typeof v === 'string' && v.length > 0;
const isIdList = (v) => Array.isArray(v) && v.every(isStr);

// ---------- cache (IndexedDB, with an in-memory fallback) ----------

const memory = new Map();
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open('atreemology-cloud', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('kv');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export async function cacheGet(key) {
  const db = await openDb();
  if (!db) return memory.get(key) ?? null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction('kv', 'readonly').objectStore('kv').get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function cachePut(key, value) {
  const db = await openDb();
  if (!db) {
    memory.set(key, value);
    return;
  }
  await new Promise((resolve) => {
    try {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

// ---------- validating and registering pack content ----------

/** Throws a readable error if a pack does not match the shapes the app relies on. */
export function validatePack(content) {
  if (!content || typeof content !== 'object') throw new Error('pack is empty');
  const roots = Array.isArray(content.roots) ? content.roots : null;
  const words = content.words && typeof content.words === 'object' ? content.words : {};
  if (!roots) throw new Error('pack has no roots list');

  for (const [id, w] of Object.entries(words)) {
    const ok = w && w.id === id && isStr(w.word) && isStr(w.definition) && isStr(w.partOfSpeech) && isStr(w.example) && LEVELS.has(w.level) && isStr(w.relationNote);
    if (!ok) throw new Error(`word "${id}" is malformed`);
  }
  for (const r of roots) {
    const ok =
      r && isStr(r.id) && isStr(r.root) && isStr(r.displayRoot) && isStr(r.meaning) && isStr(r.language) && isStr(r.originNote) &&
      isStr(r.category) && TIERS.has(r.tier) && [1, 2, 3].includes(r.difficulty) &&
      isIdList(r.connectorWordIds) && isIdList(r.commonWordIds) && isIdList(r.advancedWordIds) &&
      r.reward && isStr(r.reward.title) && isStr(r.reward.icon) && isStr(r.reward.description);
    if (!ok) throw new Error(`root "${r && r.id}" is malformed`);
    for (const wid of [...r.connectorWordIds, ...r.commonWordIds, ...r.advancedWordIds]) {
      if (!words[wid] && !WORDS[wid]) throw new Error(`root "${r.id}" uses unknown word "${wid}"`);
    }
  }
  return { roots, words };
}

/**
 * Add a pack's roots and words to the app's live data, so every screen sees them
 * as ordinary roots. Existing ids are never overwritten. `only` (a Set of root
 * ids) limits which roots are added. Returns how many roots were newly added.
 */
export function registerPack(packId, content, only = null) {
  const { roots, words } = validatePack(content);
  let added = 0;
  for (const root of roots) {
    if (only && !only.has(root.id)) continue;
    if (ROOTS_BY_ID[root.id]) continue;
    const wanted = [...root.connectorWordIds, ...root.commonWordIds, ...root.advancedWordIds];
    for (const wid of wanted) {
      if (!WORDS[wid] && words[wid]) WORDS[wid] = words[wid];
    }
    const entry = { ...root, packId };
    ROOTS.push(entry);
    ROOTS_BY_ID[root.id] = entry;
    added++;
  }
  return added;
}

/** Test helper: remove everything registered from packs. */
export function __unregisterAllPacks() {
  for (let i = ROOTS.length - 1; i >= 0; i--) {
    if (ROOTS[i].packId) {
      delete ROOTS_BY_ID[ROOTS[i].id];
      ROOTS.splice(i, 1);
    }
  }
}

// ---------- shared view of what is available and owned ----------

const view = { catalog: null, owned: new Set(), ready: false };
const listeners = new Set();
export const getPackView = () => ({ catalog: view.catalog, owned: new Set(view.owned), ready: view.ready });
export function onPacksChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit() {
  listeners.forEach((fn) => {
    try {
      fn(getPackView());
    } catch {
      /* ignore */
    }
  });
  if (typeof window !== 'undefined' && window.dispatchEvent && typeof CustomEvent !== 'undefined') {
    window.dispatchEvent(new CustomEvent('atreemology:packs'));
  }
}

export function ownsPack(packId) {
  return view.owned.has(packId) || view.owned.has('all-access');
}

function plantedRootIds() {
  try {
    const s = JSON.parse(lsGet(KEYS.state) || 'null');
    return new Set(Object.keys((s && s.progress) || {}));
  } catch {
    return new Set();
  }
}

// ---------- boot: register whatever is already cached ----------

/**
 * Before the app loads: add packs from the on-device cache. An owned pack is
 * added whole. Anything not (or no longer) owned, or when signed out, is added
 * only for roots the learner already started, so nothing they learned goes away.
 */
export async function loadCachedPacks() {
  const keys = (await cacheGet('index')) || { packs: [] };
  const entitlements = await cacheGet('entitlements');
  const user = currentUser();
  const entitled = new Set(user && entitlements && entitlements.userId === user.id ? entitlements.packs : []);
  const planted = plantedRootIds();
  const catalog = await cacheGet('catalog');
  if (catalog && Array.isArray(catalog.rows)) {
    view.catalog = catalog.rows;
    view.owned = entitled;
  }
  let added = 0;
  for (const packId of keys.packs) {
    const entry = await cacheGet(`pack:${packId}`);
    if (!entry || !entry.content) continue;
    try {
      const whole = entitled.has(packId) || entitled.has('all-access');
      added += registerPack(packId, entry.content, whole ? null : planted);
    } catch {
      /* a bad cached pack is skipped; the next refresh replaces it */
    }
  }
  // Free taste: one sample root per pack, for everyone.
  if (catalog && Array.isArray(catalog.rows)) {
    for (const row of catalog.rows) {
      if (row.sample) {
        try {
          added += registerPack(row.id, row.sample);
        } catch {
          /* ignore malformed sample */
        }
      }
    }
  }
  return added;
}

// ---------- talking to the server ----------

async function fetchCatalog() {
  const res = await api('/rest/v1/packs?select=id,title,description,sort,price_inr_paise,price_usd_cents,root_count,version,preview,sample,is_bundle&order=sort.asc', { auth: 'anon' });
  if (!res.ok) throw new Error(`catalog failed (${res.status})`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

async function fetchEntitlements() {
  const res = await api('/rest/v1/entitlements?select=pack');
  if (!res.ok) throw new Error(`entitlements failed (${res.status})`);
  const rows = await res.json();
  return new Set((Array.isArray(rows) ? rows : []).map((r) => r.pack));
}

async function fetchPackContent(packId) {
  const res = await api('/rest/v1/rpc/get_pack_content', { method: 'POST', body: { p_pack: packId } });
  if (!res.ok) throw new Error(`pack ${packId} failed (${res.status})`);
  return res.json();
}

let refreshing = null;

/**
 * Fetch the catalogue, the learner's purchases and any pack they own that is not
 * cached (or is out of date), and register everything. Safe to call repeatedly.
 * Re-draws the current screen only if new roots appeared.
 */
export function refreshPacks({ force = false } = {}) {
  if (!cloudEnabled()) return Promise.resolve({ added: 0 });
  // A forced refresh (after a purchase) must not be satisfied by one already in flight with older data.
  if (refreshing) return force ? refreshing.then(() => refreshPacks({ force })) : refreshing;
  refreshing = (async () => {
    let added = 0;
    let changed = false;
    try {
      let rows;
      try {
        rows = await fetchCatalog();
        await cachePut('catalog', { rows, at: Date.now() });
      } catch {
        const cached = await cacheGet('catalog');
        rows = cached && Array.isArray(cached.rows) ? cached.rows : view.catalog || [];
      }
      if (JSON.stringify(rows) !== JSON.stringify(view.catalog)) changed = true;
      view.catalog = rows;

      for (const row of rows) {
        if (row.sample) {
          try {
            added += registerPack(row.id, row.sample);
          } catch {
            /* ignore */
          }
        }
      }

      const user = currentUser();
      if (user) {
        try {
          const owned = await fetchEntitlements();
          await cachePut('entitlements', { userId: user.id, packs: [...owned], at: Date.now() });
          if ([...owned].sort().join() !== [...view.owned].sort().join()) changed = true;
          view.owned = owned;
        } catch {
          /* keep the last known purchases while offline */
        }
        const index = (await cacheGet('index')) || { packs: [] };
        const wanted = view.owned.has('all-access') ? rows.filter((r) => !r.is_bundle && r.id !== 'all-access') : rows.filter((r) => view.owned.has(r.id) && !r.is_bundle);
        for (const row of wanted) {
          const cached = await cacheGet(`pack:${row.id}`);
          if (!force && cached && cached.version >= row.version && !cached.stale) {
            // Already on the device; make sure it is registered for this session.
            try {
              added += registerPack(row.id, cached.content);
            } catch {
              /* ignore */
            }
            continue;
          }
          try {
            const content = await fetchPackContent(row.id);
            validatePack(content);
            await cachePut(`pack:${row.id}`, { version: row.version, content, userId: user.id, at: Date.now() });
            if (!index.packs.includes(row.id)) index.packs.push(row.id);
            added += registerPack(row.id, content);
          } catch {
            /* try again on the next refresh */
          }
        }
        await cachePut('index', index);
      }
    } finally {
      view.ready = true;
      refreshing = null;
    }
    if (added > 0 || changed) {
      emit();
      redrawIfNeeded(added);
    }
    return { added };
  })();
  return refreshing;
}

function redrawIfNeeded(added) {
  if (!added || typeof window === 'undefined') return;
  const hash = window.location.hash || '';
  // Do not interrupt a quiz or lesson in progress; the next screen change shows new roots.
  if (/^#\/(quiz|root)\b/.test(hash)) return;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

// A different learner signing in on this device must not see the previous learner's purchases.
onSessionChange(() => {
  view.owned = new Set();
  if (isSignedIn()) refreshPacks({ force: false });
  else emit();
});
