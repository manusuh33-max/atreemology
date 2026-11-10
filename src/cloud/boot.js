// Atreemology — cloud start-up, kept out of the main app so the app works
// exactly as before if anything here is missing or fails.

import { cloudEnabled } from './config.js?v=3';
import { captureOAuthRedirect } from './session.js?v=3';
import { syncBeforeBoot, syncAfterSignIn, startLiveSync, takeFlash, markFlash } from './sync.js?v=3';
import { loadCachedPacks, refreshPacks } from './packs.js?v=3';

/** Runs before the app loads: bring in any newer progress and cached packs. */
export async function prepareCloud() {
  if (!cloudEnabled()) return;
  try {
    const oauth = await captureOAuthRedirect();
    if (oauth && oauth.error) {
      markFlash(/expired|invalid/i.test(oauth.error) ? 'That email link has expired or was already used. Ask for a new code and type it into the app.' : oauth.error);
    } else if (oauth && oauth.ok) {
      // Signed in by tapping the link in the email: merge progress now, before the app loads.
      markFlash('Signed in. Your forest is now saved to the cloud.');
      await syncAfterSignIn();
    }
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
    if (msg) import('./ui.js?v=3').then((m) => m.showToast(msg)).catch(() => {});
  } catch {
    /* ignore */
  }
}
