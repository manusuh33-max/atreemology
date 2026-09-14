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
    // Only visible at the desktop breakpoint (styles.css turns .bottom-nav
    // into a left sidebar there) — on mobile this stays display:none so the
    // bottom tab bar is unchanged.
    el(
      'div.nav-brand',
      el('img.nav-brand-icon', { src: '/icons/icon-192.png', alt: '', width: 28, height: 28 }),
      el('span.nav-brand-text', 'Atreemology')
    ),
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
