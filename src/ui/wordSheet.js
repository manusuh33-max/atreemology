import { el, mount } from './dom.js';
import { icon } from './icons.js';
import { getWord } from '../data/words.js';
import { getRoot } from '../data/roots.js';
import { sharedWordRootIds } from '../state/selectors.js';
import { isDue } from '../state/srs.js';

const LEVEL_LABEL = { connector: 'Connector word', common: 'Common word', advanced: 'Advanced word' };

/**
 * Opens a bottom sheet describing one word, with a learn or review action.
 * @param {{wordId:string, rootId:string, state:object, onLearn:Function, onReview:Function}} opts
 */
export function openWordSheet({ wordId, rootId, state, onLearn, onReview }) {
  const word = getWord(wordId);
  const root = getRoot(rootId);
  const stat = state.wordStats[wordId];
  const learned = Boolean(stat?.learned);
  const due = learned && isDue(stat);
  const shared = sharedWordRootIds(wordId).filter((id) => id !== rootId);

  const overlay = el('div.sheet-overlay', { role: 'presentation' });
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const ratingRow = el(
    'div.rating-row',
    ratingButton('again', 'Again', 'tomorrow'),
    ratingButton('hard', 'Hard', '3 days'),
    ratingButton('good', 'Good', '7 days'),
    ratingButton('easy', 'Easy', '14 days')
  );

  function ratingButton(rating, label, sub) {
    return el(
      `button.rating-btn.rating-${rating}`,
      {
        onClick: () => {
          onReview(rating);
          close();
        },
      },
      el('span.rating-label', label),
      el('span.rating-sub', sub)
    );
  }

  const sheet = el(
    'div.sheet',
    { role: 'dialog', 'aria-modal': 'true', 'aria-label': word.word },
    el('div.sheet-grabber'),
    el(
      'div.sheet-header',
      el('span.sheet-level-tag', LEVEL_LABEL[word.level]),
      el('button.icon-btn', { onClick: close, 'aria-label': 'Close' }, icon('close', 18))
    ),
    el('h2.sheet-word', word.word),
    el('p.sheet-pos', word.partOfSpeech),
    el('p.sheet-definition', word.definition),
    el('blockquote.sheet-example', `“${word.example}”`),
    el(
      'div.sheet-relation',
      el('span.sheet-relation-label', `How it grows from ${root.displayRoot}`),
      el('p', word.relationNote)
    ),
    shared.length
      ? el(
          'p.sheet-shared',
          '🌿 This word also grows on the ',
          shared.map((id, i) => `${getRoot(id).root}${i < shared.length - 1 ? ' and the ' : ''}`).join(''),
          ' tree.'
        )
      : null,
    !learned
      ? el(
          'button.btn.btn-primary.btn-block',
          {
            onClick: () => {
              onLearn();
              close();
            },
          },
          `I understand — add to my tree`
        )
      : due
      ? el(
          'div.sheet-review',
          el('p.sheet-review-prompt', 'This one is due. How well did you remember it?'),
          ratingRow
        )
      : el(
          'div.sheet-mastered',
          icon('check', 18),
          el('span', `Learned — mastery ${stat.mastery}%. Next review scheduled.`)
        )
  );

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  return close;
}
