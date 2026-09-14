import { el, clear } from './dom.js';
import { icon } from './icons.js';

const TYPE_LABEL = {
  rootMeaning: 'Root meaning',
  relatedWord: 'Find the word',
  defineWord: 'Definition',
  exampleFill: 'Complete the sentence',
  graft: 'Graft the word',
  rootDetective: 'Root Detective',
};

/**
 * Renders one quiz question into `container`. Calls onDone(rating) once the
 * learner has answered AND picked a recall rating, so the SRS scheduler can
 * update that word's mastery/due date.
 */
export function renderQuizCard(container, question, onDone) {
  clear(container);
  let answered = false;

  const choiceButtons = [];
  const feedbackZone = el('div.quiz-feedback');

  const card = el(
    'div.quiz-card',
    el('span.quiz-type-tag', TYPE_LABEL[question.type] ?? 'Question'),
    el('h2.quiz-prompt', question.prompt),
    el(
      'div.quiz-choices',
      question.choices.map((choice) => {
        const btn = el('button.quiz-choice', { onClick: () => handleAnswer(choice, btn) }, choice);
        choiceButtons.push(btn);
        return btn;
      })
    ),
    feedbackZone
  );
  container.appendChild(card);

  function handleAnswer(choice, btn) {
    if (answered) return;
    answered = true;
    const correct = choice === question.answer;
    choiceButtons.forEach((b) => {
      b.disabled = true;
      const label = b.textContent;
      if (label === question.answer) b.classList.add('correct');
      else if (b === btn) b.classList.add('incorrect');
    });

    clear(feedbackZone);
    feedbackZone.appendChild(
      el(
        'div.feedback-panel',
        { class: correct ? 'correct' : 'incorrect' },
        el('div.feedback-headline-row', icon(correct ? 'check' : 'close', 18), el('span', correct ? 'Right!' : `Not quite — it's "${question.answer}."`)),
        el('p.feedback-explain', question.explain),
        el('p.feedback-ask', 'How well did you know this one, really?'),
        el(
          'div.rating-row',
          ratingBtn('again', 'Again', 'tomorrow', !correct),
          ratingBtn('hard', 'Hard', '3 days', false),
          ratingBtn('good', 'Good', '7 days', correct),
          ratingBtn('easy', 'Easy', '14 days', false)
        )
      )
    );
  }

  function ratingBtn(rating, label, sub, suggested) {
    return el(
      `button.rating-btn.rating-${rating}`,
      { class: suggested ? 'suggested' : '', onClick: () => onDone(rating) },
      el('span.rating-label', label),
      el('span.rating-sub', sub)
    );
  }
}
