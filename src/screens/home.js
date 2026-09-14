import { el, mount } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { renderSprig, sprigLine } from '../ui/sprig.js';
import { renderReviewQueue } from '../ui/reviewQueue.js';
import { renderJournalList } from '../ui/journalEntry.js';
import { getState, reviewWordAction } from '../state/store.js';
import { allDueWords, suggestedAction, forestSummary } from '../state/selectors.js';
import { getRoot } from '../data/roots.js';
import { openWordSheet } from '../ui/wordSheet.js';
import { navigate } from '../router.js';

function greetingSprigLine(state, summary) {
  if (summary.treesPlanted === 0) return sprigLine('empty');
  if (summary.dueCount > 0) return sprigLine('due', summary.dueCount);
  if (state.streak.current > 1) return sprigLine('streak', state.streak.current);
  return sprigLine('allCaughtUp');
}

function actionButton(state) {
  const action = suggestedAction(state);
  if (action.type === 'review') {
    return el('button.btn.btn-primary.btn-block.btn-large', { onClick: () => navigate('#/quiz') }, icon('droplet', 20), `Tend ${action.count} due word${action.count === 1 ? '' : 's'}`);
  }
  if (action.type === 'learn') {
    const root = getRoot(action.rootId);
    return el('button.btn.btn-primary.btn-block.btn-large', { onClick: () => navigate(`#/root/${action.rootId}`) }, icon('leaf', 20), `Keep growing ${root.displayRoot}`);
  }
  if (action.type === 'plant') {
    return el('button.btn.btn-primary.btn-block.btn-large', { onClick: () => navigate('#/seeds') }, icon('seed', 20), 'Plant your first seed');
  }
  return el('button.btn.btn-secondary.btn-block.btn-large', { onClick: () => navigate('#/seeds') }, icon('compass', 20), 'Explore the Seed Library');
}

export function renderHome(container) {
  const state = getState();
  const summary = forestSummary(state);
  const due = allDueWords(state);

  const greetingName = state.profile.name ? `, ${state.profile.name}` : '';

  const view = el(
    'div.screen.home-screen',
    el(
      'header.home-header',
      el('p.home-eyebrow', `Day streak`),
      el('div.streak-display', icon('flame', 22), el('span.streak-number', state.streak.current)),
      el('h1.home-greeting', `Welcome back${greetingName}`)
    ),
    renderSprig(greetingSprigLine(state, summary), { calmMode: state.profile.calmMode }),
    el(
      'div.forest-stats-row',
      statTile('Trees planted', summary.treesPlanted, 'forest'),
      statTile('Words learned', summary.totalWordsLearned, 'leaf'),
      statTile('Forest health', `${summary.avgHealth}%`, 'droplet')
    ),
    actionButton(state),
    due.length > 0
      ? el(
          'section.home-section',
          el('h2', 'Due for a visit'),
          renderReviewQueue(due, (rootId, wordId) =>
            openWordSheet({
              wordId,
              rootId,
              state: getState(),
              onLearn: () => {},
              onReview: (rating) => reviewWordAction(rootId, wordId, rating),
            })
          )
        )
      : null,
    el(
      'section.home-section',
      el('div.section-heading-row', el('h2', 'Field journal'), el('button.link-btn', { onClick: () => navigate('#/profile') }, 'See all')),
      renderJournalList(state.journal.slice(0, 3))
    )
  );

  mount(container, view);
}

function statTile(label, value, iconName) {
  return el('div.stat-tile', icon(iconName, 18), el('strong', String(value)), el('span', label));
}
