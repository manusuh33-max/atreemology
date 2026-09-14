import { el, mount } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { getState, updateProfile, resetAllProgress } from '../state/store.js';
import { forestSummary } from '../state/selectors.js';
import { exportProgress } from '../state/storage.js';
import { ROOTS } from '../data/roots.js';
import { COMING_SOON_ROOTS } from '../data/comingSoonRoots.js';
import { renderJournalList } from '../ui/journalEntry.js';

const ROADMAP_TIERS = [
  {
    name: 'Foundational Grove',
    count: ROOTS.length,
    detail: `Verified and plantable right now, in three waves: 10 standalone roots first, then 12 that combine with another into a two-root word (like dict + bene → benediction, or in- + spect → inspect), then 4 hub roots — spect alone bridges to six prefixes, tele to four others — where growing one tree visibly reaches into several more. Six of those 12 are prefixes (in-, ex-, re-, circum-, per-, retro-) prototyped on the spect family: each gets its own small tree, and words like "inspect" or "expect" render as a literal branch connecting the prefix's tree to spect's.`,
    done: true,
  },
  { name: 'Core Forest', count: COMING_SOON_ROOTS.length, detail: 'Standard Greco-Latin roots, scoped and named — next up for word-by-word verification, following the same basic-roots-first-then-combinations approach once they\'re added.', done: false },
  { name: 'Deep Forest', count: 300, detail: 'Intermediate academic vocabulary, once the Core Forest is verified.', done: false },
  { name: 'Scholar Grove', count: 500, detail: 'Advanced vocabulary for confident readers.', done: false },
  { name: 'Specialist Biomes', count: 1000, detail: 'Medical, legal, and scientific root families.', done: false },
];

export function renderProfile(container) {
  const state = getState();
  const summary = forestSummary(state);

  const view = el(
    'div.screen.profile-screen',
    el('header.screen-header', el('h1', 'Profile')),
    el(
      'section.profile-card',
      el('label.field-label', 'Name', el('input.text-input', {
        type: 'text',
        value: state.profile.name,
        placeholder: 'Your name',
        maxlength: '24',
        onChange: (e) => updateProfile({ name: e.target.value.trim() }),
      })),
      el(
        'label.toggle-row',
        el('span', 'Calm mode', el('span.toggle-hint', 'Hides Sprig and reduces flourish')),
        el('input', {
          type: 'checkbox',
          checked: state.profile.calmMode,
          onChange: (e) => updateProfile({ calmMode: e.target.checked }),
        })
      )
    ),
    el(
      'section.profile-stats-grid',
      statBlock('Trees planted', summary.treesPlanted),
      statBlock('Trees completed', summary.treesCompleted),
      statBlock('Words learned', summary.totalWordsLearned),
      statBlock('Total reviews', state.stats.totalReviews),
      statBlock('Current streak', state.streak.current),
      statBlock('Longest streak', state.streak.longest)
    ),
    el(
      'section.home-section',
      el('h2', 'Learning roadmap'),
      el(
        'div.roadmap-list',
        ROADMAP_TIERS.map((tier) =>
          el(
            `div.roadmap-tier${tier.done ? '.roadmap-tier--done' : ''}`,
            el('div.roadmap-tier-head', el('strong', tier.name), el('span', `${tier.count} roots`)),
            el('p', tier.detail)
          )
        )
      )
    ),
    el(
      'section.home-section',
      el('h2', 'Full field journal'),
      renderJournalList(state.journal)
    ),
    el(
      'section.danger-zone',
      el(
        'p.field-hint',
        'Your forest is saved only on this device — clearing browser data or switching phones starts over. Export a backup now and then.'
      ),
      el('button.btn.btn-secondary.btn-block', { onClick: () => exportProgress(getState()) }, icon('book', 18), 'Export my progress'),
      el('button.btn.btn-ghost.btn-danger', { onClick: onResetClick }, 'Reset all progress')
    )
  );

  mount(container, view);

  function onResetClick(e) {
    const btn = e.currentTarget;
    if (btn.dataset.confirm === '1') {
      resetAllProgress();
      renderProfile(container);
      return;
    }
    btn.dataset.confirm = '1';
    btn.textContent = 'Tap again to confirm — this clears everything';
    setTimeout(() => {
      if (btn.isConnected) {
        btn.dataset.confirm = '0';
        btn.textContent = 'Reset all progress';
      }
    }, 4000);
  }
}

function statBlock(label, value) {
  return el('div.stat-block', el('strong', String(value)), el('span', label));
}
