import { el } from './dom.js';
import { icon } from './icons.js';
import { getWord } from '../data/words.js';
import { getRoot } from '../data/roots.js';

/**
 * A compact list of due words across the whole forest, with a single
 * "Review" CTA per row. Framed as tending, never as a debt.
 */
export function renderReviewQueue(dueItems, onReview) {
  if (!dueItems.length) {
    return el('div.review-queue-empty', icon('leaf', 20), el('p', 'No reviews due — the forest is resting.'));
  }
  return el(
    'ul.review-queue',
    dueItems.slice(0, 6).map(({ rootId, wordId }) => {
      const word = getWord(wordId);
      const root = getRoot(rootId);
      return el(
        'li.review-row',
        el('div.review-row-info', el('strong', word.word), el('span.review-row-root', root.displayRoot)),
        el('button.btn.btn-small.btn-secondary', { onClick: () => onReview(rootId, wordId) }, 'Water')
      );
    }),
    dueItems.length > 6 ? el('li.review-row-more', `+${dueItems.length - 6} more waiting`) : null
  );
}
