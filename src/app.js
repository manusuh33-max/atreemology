import { el, mount, clear } from './ui/dom.js';
import { renderBottomNav } from './ui/bottomNav.js';
import { getState, subscribe } from './state/store.js';
import { onRouteChange, parseHash, navigate } from './router.js';

import { renderOnboarding } from './screens/onboarding.js';
import { renderHome } from './screens/home.js';
import { renderSeedLibrary } from './screens/seedLibrary.js';
import { renderForest } from './screens/forest.js';
import { renderRootDetail } from './screens/rootDetail.js';
import { renderQuiz } from './screens/quiz.js';
import { renderRewards } from './screens/rewards.js';
import { renderProfile } from './screens/profile.js';

const TAB_FOR_ROUTE = { home: 'home', seeds: 'seeds', forest: 'forest', root: 'forest', rewards: 'rewards', profile: 'profile', quiz: 'home' };

// A render bug (a bad data entry, a browser quirk that only shows up in
// the wild) used to leave real users staring at a permanent blank white
// screen with no way back in, since nothing ever caught the thrown error.
// renderCrashScreen() is the last-resort fallback: it never depends on
// app state, so it can render even when the state itself is what broke.
function renderCrashScreen(main, error) {
  console.error('Etymon crashed while rendering:', error);
  clear(main);
  main.appendChild(
    el(
      'div.screen.crash-screen',
      el('div.crash-icon', '🌱'),
      el('h1', 'Something went wrong'),
      el('p', "This page hit a snag and couldn't load. Your saved progress is untouched — reloading usually fixes it."),
      el('button.btn.btn-primary.btn-block', { onClick: () => window.location.reload() }, 'Reload Etymon'),
      el(
        'button.btn.btn-ghost.btn-block',
        {
          onClick: () => {
            window.location.hash = '#/home';
            window.location.reload();
          },
        },
        'Go back to Home instead'
      )
    )
  );
}

export function boot(root) {
  const shell = el(
    'div.app-shell',
    el('main.app-main#app-main'),
    el('div#app-nav')
  );
  mount(root, shell);

  const main = shell.querySelector('#app-main');
  const navHost = shell.querySelector('#app-nav');

  function render() {
    try {
      const state = getState();

      if (!state.onboarded) {
        clear(navHost);
        renderOnboarding(main);
        return;
      }

      const route = parseHash();
      const tab = TAB_FOR_ROUTE[route.name] ?? 'home';
      mount(navHost, renderBottomNav(tab, (id) => navigate(`#/${id}`)));

      switch (route.name) {
        case 'home':
          renderHome(main);
          break;
        case 'seeds':
          renderSeedLibrary(main);
          break;
        case 'forest':
          renderForest(main);
          break;
        case 'root':
          renderRootDetail(main, route.parts[1]);
          break;
        case 'quiz':
          renderQuiz(main, route.parts[1] || null);
          break;
        case 'rewards':
          renderRewards(main);
          break;
        case 'profile':
          renderProfile(main);
          break;
        default:
          renderHome(main);
      }
      main.scrollTo({ top: 0 });
    } catch (error) {
      renderCrashScreen(main, error);
    }
  }

  // Catches anything render() doesn't (e.g. an error thrown from inside a
  // button's onClick handler, after render already finished) so it still
  // reaches the same fallback screen instead of failing silently in the
  // console with a stuck UI.
  window.addEventListener('error', (e) => renderCrashScreen(main, e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => renderCrashScreen(main, e.reason));

  subscribe(render);
  onRouteChange(render);
  if (!window.location.hash) window.location.hash = '#/home';
  render();
}
