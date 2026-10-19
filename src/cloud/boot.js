// Atreemology — cloud start-up, kept out of the main app so the app works
// exactly as before if anything here is missing or fails.

import { cloudEnabled } from './config.js?v=1';
import { captureOAuthRedirect } from './session.js?v=1';
import { syncBeforeBoot, startLiveSync, takeFlash, markFlash } from './sync.js?v=1';
import { loadCachedPacks, refreshPacks } from './packs.js?v=1';

/** Runs before the app loads: bring in any newer progress and cached packs. */
export async function prepareCloud() {
  if (!cloudEnabled()) return;
  try {
    const oauth = await captureOAuthRedirect();
    if (oauth && oauth.error) markFlash(oauth.error);
  } catch {
    /* ignore */
  }
  try {
    await syncBeforeBoot();
  } catch {
    /* offline or slow: the app starts with what is on the device */
  }
  try {
    await loadCachedPacks();
  } catch {
    /* ignore */
  }
}

/** Runs after the app has drawn its first screen. */
export function startCloud() {
  if (!cloudEnabled()) return;
  startLiveSync().catch(() => {});
  refreshPacks().catch(() => {});
  try {
    const msg = takeFlash();
    if (msg) import('./ui.js?v=1').then((m) => m.showToast(msg)).catch(() => {});
  } catch {
    /* ignore */
  }
}
