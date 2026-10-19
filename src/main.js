// The ?v= on app.js is a cache-buster: Hostinger's CDN caches static assets for
// up to 7 days keyed by exact URL, and ES module imports are fetched by URL, so
// a changed module must be imported under a new URL or visitors keep the old
// copy. See README "CDN caching". Bump it whenever app.js changes.
//
// app.js is imported *after* the optional cloud step, because the app reads the
// saved progress and the list of roots once, when it first loads. The cloud step
// is wrapped so that any failure (or no configuration at all) simply means the
// app starts from what is on this device, exactly as it always has.
(async () => {
  let cloud = null;
  try {
    cloud = await import('./cloud/boot.js?v=1');
    await cloud.prepareCloud();
  } catch (err) {
    console.warn('Cloud features skipped:', err);
    cloud = null;
  }

  const { boot } = await import('./app.js?v=3');
  boot(document.getElementById('root'));

  try {
    if (cloud) cloud.startCloud();
  } catch (err) {
    console.warn('Cloud start skipped:', err);
  }
})();
