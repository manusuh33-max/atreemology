import { el } from './dom.js';
import { icon } from './icons.js';

const TABS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'seeds', label: 'Seeds', icon: 'seed' },
  { id: 'forest', label: 'Forest', icon: 'forest' },
  { id: 'rewards', label: 'Rewards', icon: 'reward' },
  { id: 'profile', label: 'Profile', icon: 'profile' },
];

export function renderBottomNav(activeTab, onNavigate) {
  return el(
    'nav.bottom-nav',
    { 'aria-label': 'Primary' },
    TABS.map((tab) =>
      el(
        'button.nav-tab',
        {
          class: tab.id === activeTab ? 'active' : '',
          'aria-current': tab.id === activeTab ? 'page' : null,
          onClick: () => onNavigate(tab.id),
        },
        icon(tab.icon, 22),
        el('span.nav-label', tab.label)
      )
    )
  );
}
