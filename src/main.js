// The ?v= on app.js is a cache-buster: Hostinger's CDN caches static assets for
// up to 7 days keyed by exact URL, and ES module imports are fetched by URL, so
// a changed module must be imported under a new URL or visitors keep the old
// copy. See README "CDN caching". Bump it whenever app.js changes.
import { boot } from './app.js?v=2';

const root = document.getElementById('root');
boot(root);
