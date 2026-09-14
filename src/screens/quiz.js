import { el, mount, clear } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { getState, reviewWordAction, recordQuizHistory } from '../state/store.js';
import { buildQuiz } from '../state/quizGenerator.js';
import { renderQuizCard } from '../ui/quizCard.js';
import { sprigLine } from '../ui/sprig.js';
import { navigate } from '../router.js';

// The app re-runs the current screen's render function on every store
// commit (not just on navigation) so screens always reflect fresh state.
// Most screens have no ephemeral state of their own, so that's harmless —
// but a quiz in progress does (which question we're on, the running
// score), and every answer submission is itself a commit (reviewWordAction).
// Without this guard, submitting an answer would immediately trigger a
// full re-render that rebuilt a brand-new random quiz from scratch and
// restarted at question one — which is what made practice feel like it
// was "repeating the same questions" instead of progressing. Track the
// DOM node of the in-progress session and skip rebuilding as long as it's
// still the one mounted; once navigation replaces it, the check fails and
// a fresh session starts normally.
let activeSession = null; // { container, rootId, node }

export function renderQuiz(container, rootId = null) {
  if (
    activeSession &&
    activeSession.container === container &&
    activeSession.rootId === rootId &&
    container.contains(activeSession.node)
  ) {
    return;
  }

  const state = getState();
  const questions = buildQuiz(state, { rootId, length: 8 });

  if (!questions.length) {
    mount(
      container,
      el(
        'div.screen.quiz-screen',
        el('header.screen-header', el('h1', 'Quiz')),
        el('div.empty-state', el('div.empty-state-art', '🌱'), el('p', 'Learn a word or two first, then come back to quiz yourself on them.'), el('button.btn.btn-primary', { onClick: () => navigate('#/forest') }, 'Back to forest'))
      )
    );
    return;
  }

  let index = 0;
  let correctCount = 0;
  let ratingsGiven = 0;

  const view = el(
    'div.screen.quiz-screen',
    el(
      'header.screen-header.quiz-header',
      el('button.icon-btn.back-btn', { onClick: () => navigate(rootId ? `#/root/${rootId}` : '#/home'), 'aria-label': 'Exit quiz' }, icon('close', 18)),
      el('div.quiz-progress-bar', el('div.quiz-progress-fill#quiz-progress-fill'))
    ),
    el('div#quiz-body')
  );
  mount(container, view);
  activeSession = { container, rootId, node: view };
  // Record history only after the guard above is armed — this itself
  // commits (to remember which questions were just asked), which
  // synchronously re-triggers the app's global render while we're still
  // inside this call; the now-active guard makes that reentrant call a
  // no-op instead of another full rebuild.
  recordQuizHistory(questions.map((q) => q.key));

  const body = view.querySelector('#quiz-body');
  const progressFill = view.querySelector('#quiz-progress-fill');

  function showQuestion() {
    progressFill.style.width = `${(index / questions.length) * 100}%`;
    const q = questions[index];
    const wasCorrectTracked = { done: false };
    renderQuizCard(body, q, (rating) => {
      reviewWordAction(q.rootId, q.wordId, rating);
      if (!wasCorrectTracked.done) {
        wasCorrectTracked.done = true;
        if (rating === 'good' || rating === 'easy') correctCount += 1;
        ratingsGiven += 1;
      }
      index += 1;
      if (index < questions.length) {
        showQuestion();
      } else {
        showSummary();
      }
    });
  }

  function showSummary() {
    progressFill.style.width = '100%';
    const pct = Math.round((correctCount / questions.length) * 100);
    clear(body);
    body.appendChild(
      el(
        'div.quiz-summary',
        el('div.quiz-summary-art', pct >= 70 ? '🌤️' : '🌦️'),
        el('h2', `${correctCount} of ${questions.length} remembered well`),
        el('p', sprigLine(pct >= 70 ? 'quizCorrect' : 'quizWrong')),
        el(
          'button.btn.btn-primary.btn-block',
          { onClick: () => navigate(rootId ? `#/root/${rootId}` : '#/home') },
          'Back to the forest'
        )
      )
    );
  }

  showQuestion();
}
