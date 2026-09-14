import { el, mount, clear } from '../ui/dom.js';
import { ROOTS } from '../data/roots.js';
import { COMING_SOON_ROOTS } from '../data/comingSoonRoots.js';
import { renderRootCard } from '../ui/rootCard.js';
import { getState, plantSeed } from '../state/store.js';
import { isRootUnlocked } from '../state/selectors.js';
import { isPlanted } from '../state/storage.js';
import { navigate } from '../router.js';

const CATEGORIES = ['All', ...new Set(ROOTS.map((r) => r.category))];
const TIER_RANK = { Beginner: 0, Intermediate: 1, Advanced: 2 };

export function renderSeedLibrary(container) {
  let query = '';
  let category = 'All';

  const view = el(
    'div.screen.seed-library-screen',
    el(
      'header.screen-header',
      el('h1', 'Seed Library'),
      el('p.screen-sub', `${ROOTS.length} roots verified and ready to grow — the full Foundational Grove`)
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
    // Deliberately a plain, non-interactive, greyed-out note — no per-root
    // names/meanings/origins for anything beyond the Foundational Grove.
    // This app's free tier is scoped to exactly these roots; future roots
    // aren't previewable, only their existence and count are.
    el(
      'section.coming-soon-section.coming-soon-locked',
      el(
        'div.coming-soon-lock-note',
        el('span.coming-soon-lock-icon', '🔒'),
        el('span', `${COMING_SOON_ROOTS.length}+ more root families are on the roadmap for future updates`)
      )
    )
  );

  const grid = view.querySelector('#seed-library-grid');

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

    const growing = filtered.filter((r) => isPlanted(state, r.id));
    const readyToPlant = filtered.filter((r) => !isPlanted(state, r.id) && isRootUnlocked(state, r));
    const locked = filtered
      .filter((r) => !isPlanted(state, r.id) && !isRootUnlocked(state, r))
      .sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]);

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

    const group = (label, roots) => {
      if (!roots.length) return;
      grid.appendChild(el('h2.root-card-group-heading', label));
      roots.forEach((root) => grid.appendChild(renderCard(root)));
    };

    group(`Growing (${growing.length})`, growing);
    group(`Ready to plant (${readyToPlant.length})`, readyToPlant);
    if (locked.length) {
      grid.appendChild(
        el(
          'h2.root-card-group-heading',
          `Locked (${locked.length})`,
          el('span.root-card-group-subhead', 'grow more roots above to unlock')
        )
      );
      locked.forEach((root) => grid.appendChild(renderCard(root)));
    }
  }

  renderList();
  mount(container, view);
}
