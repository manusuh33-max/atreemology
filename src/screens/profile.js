import { el, mount } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { getState, updateProfile, resetAllProgress } from '../state/store.js';
import { forestSummary } from '../state/selectors.js';
import { exportProgress } from '../state/storage.js';
import { ROOTS } from '../data/roots.js';
import { renderJournalList } from '../ui/journalEntry.js';

// Only the Foundational Grove is named, counted, and described — this is
// the entire free experience. Everything past it is intentionally a single
// greyed-out, generic line: no future tier names, category hints, or counts
// that would tell someone what's locked beyond "there's more later."
const ROADMAP_TIERS = [
  {
    name: 'Foundational Grove',
    count: ROOTS.length,
    detail: `Verified and plantable right now, in three waves: 10 standalone roots first, then 12 that combine with another into a two-root word (like dict + bene → benediction, or in- + spect → inspect), then 4 hub roots — spect alone bridges to six prefixes, tele to four others — where growing one tree visibly reaches into several more. Six of those 12 are prefixes (in-, ex-, re-, circum-, per-, retro-) prototyped on the spect family: each gets its own small tree, and words like "inspect" or "expect" render as a literal branch connecting the prefix's tree to spect's.`,
    done: true,
  },
  {
    name: 'More on the way',
    count: null,
    detail: 'Future updates will keep adding new root families beyond the Foundational Grove.',
    done: false,
    locked: true,
  },
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
            `div.roadmap-tier${tier.done ? '.roadmap-tier--done' : ''}${tier.locked ? '.roadmap-tier--locked' : ''}`,
            el(
              'div.roadmap-tier-head',
              el('strong', tier.locked ? `🔒 ${tier.name}` : tier.name),
              tier.count != null ? el('span', `${tier.count} roots`) : null
            ),
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
