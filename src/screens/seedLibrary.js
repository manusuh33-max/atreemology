import { el, mount, clear } from '../ui/dom.js';
import { ROOTS } from '../data/roots.js';
import { COMING_SOON_ROOTS } from '../data/comingSoonRoots.js';
import { renderRootCard } from '../ui/rootCard.js';
import { getState, plantSeed } from '../state/store.js';
import { isRootUnlocked } from '../state/selectors.js';
import { isPlanted } from '../state/storage.js';
import { navigate } from '../router.js';

const TIER_RANK = { Beginner: 0, Intermediate: 1, Advanced: 2 };

// These styles live here (injected once) rather than in styles.css, which the
// CDN caches for days under an unchanging URL.
const GROUP_CSS = `
.sl-group-head { margin: 26px 0 12px; grid-column: 1 / -1; }
.root-card-grid > .sl-group-head:first-child { margin-top: 8px; }
.sl-group-title-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.sl-group-title { margin: 0; font-size: 22px; line-height: 1.2; }
.sl-badge { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; white-space: nowrap; }
.sl-badge--free { background: var(--color-primary-light); color: var(--color-primary-dark); }
.sl-badge--soon { background: var(--color-accent-soft); color: var(--color-accent-text); }
.sl-badge--premium { background: var(--color-surface-alt); color: var(--color-bark); border: 1px solid var(--color-border); }
.sl-group-blurb { margin: 4px 0 0; font-size: 13px; color: var(--color-text-muted); line-height: 1.5; }
.sl-soon { margin-top: 30px; border: 1px dashed var(--color-soil-dark); border-radius: var(--radius-md); padding: 4px 16px 16px; background: var(--color-surface-alt); }
.sl-soon .sl-group-head { margin-top: 16px; }
.sl-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.sl-tag { font-size: 12px; padding: 4px 10px; border-radius: 999px; background: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text-muted); }
`;
function ensureGroupStyles() {
  if (document.getElementById('seed-group-styles')) return;
  const style = document.createElement('style');
  style.id = 'seed-group-styles';
  style.textContent = GROUP_CSS;
  document.head.appendChild(style);
}

const titleCase = (id) => id.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

function groupHead({ title, badge, badgeKind, blurb }) {
  return el(
    'div.sl-group-head',
    el('div.sl-group-title-row', el('h2.sl-group-title', title), el(`span.sl-badge.sl-badge--${badgeKind}`, badge)),
    blurb ? el('p.sl-group-blurb', blurb) : null
  );
}

export function renderSeedLibrary(container) {
  ensureGroupStyles();
  const FOUNDATIONAL_COUNT = ROOTS.filter((r) => !r.packId).length;
  // Computed per render (not at import) so roots from unlocked packs get their chips.
  const CATEGORIES = ['All', ...new Set(ROOTS.map((r) => r.category))];
  let query = '';
  let category = 'All';
  let comingSoonOpen = false;

  const view = el(
    'div.screen.seed-library-screen',
    el(
      'header.screen-header',
      el('h1', 'Seed Library'),
      el('p.screen-sub', `Foundational Grove: ${FOUNDATIONAL_COUNT} roots ready to grow · Core Forest: ${COMING_SOON_ROOTS.length} more coming`)
    ),
    el('input.search-input', {
      type: 'search',
      placeholder: 'Search roots or meanings…',
      'aria-label': 'Search seed library',
      onInput: (e) => {
        query = e.target.value.toLowerCase();
        renderList();
      },
    }),
    el(
      'div.category-chip-row',
      CATEGORIES.map((c) =>
        el(`button.chip${c === category ? '.chip-active' : ''}`, {
          onClick: (e) => {
            category = c;
            view.querySelectorAll('.chip').forEach((b) => b.classList.remove('chip-active'));
            e.currentTarget.classList.add('chip-active');
            renderList();
          },
        }, c)
      )
    ),
    el('div.root-card-grid#seed-library-grid'),
    el(
      'section.coming-soon-section.sl-soon',
      groupHead({
        title: 'Core Forest',
        badge: 'Coming soon',
        badgeKind: 'soon',
        blurb: `${COMING_SOON_ROOTS.length} standard Greco-Latin roots, the next group after the Foundational Grove. They're listed here so you can see what's ahead; each one opens for planting once its words have been checked one by one.`,
      }),
      el(
        'button.coming-soon-toggle',
        { type: 'button', onClick: () => { comingSoonOpen = !comingSoonOpen; renderComingSoon(); } },
        el('span.coming-soon-toggle-label', `See the ${COMING_SOON_ROOTS.length} roots in Core Forest`),
        el('span.coming-soon-caret', comingSoonOpen ? '▲' : '▼')
      ),
      el('div#coming-soon-list')
    )
  );

  if (ROOTS.filter((r) => r.packId === 'core-forest').length > 1) {
    // Full Core Forest content (not just the free sample) is on this device, so the placeholder is redundant.
    view.querySelector('.sl-soon')?.remove();
  }
  const grid = view.querySelector('#seed-library-grid');
  const comingSoonList = view.querySelector('#coming-soon-list');
  const comingSoonToggle = view.querySelector('.coming-soon-toggle');

  function renderComingSoon() {
    comingSoonToggle.querySelector('.coming-soon-caret').textContent = comingSoonOpen ? '▲' : '▼';
    clear(comingSoonList);
    if (!comingSoonOpen) return;
    // Names only on purpose: meanings are shown once a root is verified and plantable.
    comingSoonList.appendChild(el('div.sl-tags', COMING_SOON_ROOTS.map((r) => el('span.sl-tag', r.title))));
  }

  // Cards used to render in the dataset's original authoring order, so a
  // locked "Advanced" root could sit right next to an unlocked "Beginner"
  // one with nothing to explain why. Grouping by status — already growing,
  // then unlocked-but-not-planted, then locked (by tier) — makes the
  // actual progression visible at a glance instead of something you have
  // to infer card-by-card. A root you already planted stays in "Growing"
  // even if a later tier reshuffle would now call it locked for a NEW
  // planting — it was never something you needed to re-unlock.
  function renderList() {
    const state = getState();
    const filtered = ROOTS.filter((r) => {
      const matchesQuery = !query || r.root.toLowerCase().includes(query) || r.meaning.toLowerCase().includes(query);
      const matchesCategory = category === 'All' || r.category === category;
      return matchesQuery && matchesCategory;
    });
    clear(grid);
    if (!filtered.length) {
      grid.appendChild(el('p.empty-hint', 'No roots match that search.'));
      return;
    }

    const renderCard = (root) =>
      renderRootCard({
        root,
        state,
        onOpen: (id) => navigate(`#/root/${id}`),
        onPlant: (id) => {
          plantSeed(id);
          navigate(`#/root/${id}`);
        },
      });

    // One block per package: Foundational Grove first (roots with no packId),
    // then any premium packs whose roots are registered on this device.
    const packOrder = ['', ...new Set(ROOTS.filter((r) => r.packId).map((r) => r.packId))];
    packOrder.forEach((packId) => {
      const inPack = filtered.filter((r) => (r.packId || '') === packId);
      if (!inPack.length) return;
      const total = ROOTS.filter((r) => (r.packId || '') === packId).length;
      grid.appendChild(
        packId
          ? groupHead({ title: titleCase(packId), badge: 'Premium', badgeKind: 'premium', blurb: `${total} roots` })
          : groupHead({ title: 'Foundational Grove', badge: 'Free', badgeKind: 'free', blurb: `${total} verified roots to start with. Every other group builds on these.` })
      );

      const growing = inPack.filter((r) => isPlanted(state, r.id));
      const readyToPlant = inPack.filter((r) => !isPlanted(state, r.id) && isRootUnlocked(state, r));
      const locked = inPack
        .filter((r) => !isPlanted(state, r.id) && !isRootUnlocked(state, r))
        .sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]);

      const group = (label, roots) => {
        if (!roots.length) return;
        grid.appendChild(el('h3.root-card-group-heading', label));
        roots.forEach((root) => grid.appendChild(renderCard(root)));
      };
      group(`Growing (${growing.length})`, growing);
      group(`Ready to plant (${readyToPlant.length})`, readyToPlant);
      if (locked.length) {
        grid.appendChild(
          el('h3.root-card-group-heading', `Locked (${locked.length})`, el('span.root-card-group-subhead', 'grow more roots above to unlock'))
        );
        locked.forEach((root) => grid.appendChild(renderCard(root)));
      }
    });
  }

  renderList();
  renderComingSoon();
  mount(container, view);
}
