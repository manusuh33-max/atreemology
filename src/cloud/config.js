// Atreemology — optional cloud features (accounts, sync, premium packs).
//
// Everything in src/cloud/ is OPTIONAL: if the public settings below are not
// filled in (see app/index.html), cloudEnabled() is false and the app behaves
// exactly as it did before — local-only, no account, no network calls.
//
// Cache note: every import between cloud files uses the same `?v=1` suffix so
// each module is loaded once under one URL. To ship a change to any cloud file,
// bump that suffix everywhere (README "CDN caching" has a one-line command).

const g = globalThis;
const raw = (g.window && g.window.__ATREEMOLOGY__) || g.__ATREEMOLOGY__ || {};

export const CLOUD = Object.freeze({
  url: String(raw.supabaseUrl || '').replace(/\/+$/, ''),
  // The anon key is a PUBLIC key by design: it only identifies the project.
  // What a visitor can actually do is limited by the row-level rules in
  // supabase/schema.sql, not by keeping this key secret.
  anonKey: String(raw.supabaseAnonKey || ''),
  googleEnabled: raw.googleEnabled === true,
  usdEnabled: raw.usdEnabled === true,
});

export function cloudEnabled() {
  return Boolean(CLOUD.url && CLOUD.anonKey);
}

export const KEYS = Object.freeze({
  state: 'atreemology:v1:state', // must match STORAGE_KEY in state/storage.js
  session: 'atreemology:v1:session',
  meta: 'atreemology:v1:cloud',
  flash: 'atreemology:cloud:flash',
});

export function lsGet(key) {
  try {
    return g.localStorage ? g.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function lsSet(key, value) {
  try {
    if (g.localStorage) g.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function lsRemove(key) {
  try {
    if (g.localStorage) g.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
