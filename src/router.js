// Etymon — tiny hash router. No dependency, works over file:// or a static server.

const listeners = new Set();

export function navigate(hash) {
  if (window.location.hash === hash) {
    // force a re-render even if navigating to the same hash
    listeners.forEach((fn) => fn(parseHash(hash)));
  } else {
    window.location.hash = hash;
  }
}

export function parseHash(hash = window.location.hash) {
  const raw = hash.replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(query);
  return { parts, name: parts[0] || 'home', params };
}

export function onRouteChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

window.addEventListener('hashchange', () => {
  listeners.forEach((fn) => fn(parseHash()));
});
