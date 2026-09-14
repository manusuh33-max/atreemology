import { el, mount } from '../ui/dom.js';
import { ROOTS } from '../data/roots.js';
import { completeOnboarding, plantSeed } from '../state/store.js';
import { navigate } from '../router.js';

const STEPS = [
  {
    title: 'Grow your own vocabulary forest',
    body: "Atreemology teaches English roots like real plants: a seed becomes a root, a root becomes a tree, and a tree becomes a whole forest of words you'll actually remember.",
    art: '🌱',
  },
  {
    title: 'Every word has a root',
    body: "Below ground there's just the root itself — a bound piece like \"spect\" that isn't a word on its own. Every real word it produces grows above ground as a branch: the closest, simplest words nearest the trunk, then common words, then more advanced ones further out.",
    art: '🌳',
  },
  {
    title: 'Some trees grow together',
    body: "A few words are built from two roots at once — plant both, and that word appears as an actual branch connecting the two trees in your Forest, not just two separate lessons.",
    art: '🌿',
  },
  {
    title: 'Tending is how you remember',
    body: "Reviews aren't a chore — they're water. A quick visit now and then keeps every tree healthy, and a missed one never punishes you.",
    art: '💧',
  },
];

export function renderOnboarding(container) {
  let step = 0;
  let name = '';

  function render() {
    if (step < STEPS.length) {
      mount(container, renderIntroStep());
    } else {
      mount(container, renderSeedStep());
    }
  }

  function renderIntroStep() {
    const s = STEPS[step];
    return el(
      'div.onboarding-screen',
      el('div.onboarding-art', s.art),
      el('h1.onboarding-title', s.title),
      el('p.onboarding-body', s.body),
      el(
        'div.onboarding-dots',
        STEPS.map((_, i) => el(`span.dot${i === step ? '.dot-active' : ''}`))
      ),
      el(
        'div.onboarding-actions',
        step > 0 ? el('button.btn.btn-ghost', { onClick: () => { step -= 1; render(); } }, 'Back') : el('span'),
        el('button.btn.btn-primary', { onClick: () => { step += 1; render(); } }, step === STEPS.length - 1 ? "Let's go" : 'Next')
      )
    );
  }

  function renderSeedStep() {
    let selected = 'scrib-script';
    const grid = el(
      'div.onboarding-seed-grid',
      ROOTS.slice(0, 6).map((root) =>
        el(
          `button.onboarding-seed-option${root.id === selected ? '.selected' : ''}`,
          {
            onClick: (e) => {
              selected = root.id;
              grid.querySelectorAll('.onboarding-seed-option').forEach((b) => b.classList.remove('selected'));
              e.currentTarget.classList.add('selected');
            },
          },
          el('span.onboarding-seed-emoji', root.reward.icon),
          el('span.onboarding-seed-root', root.displayRoot),
          el('span.onboarding-seed-meaning', root.meaning)
        )
      )
    );

    return el(
      'div.onboarding-screen',
      el('h1.onboarding-title', 'Choose your first seed'),
      el('p.onboarding-body', 'You can plant more any time from the Seed Library. Start with one that sounds interesting.'),
      grid,
      el(
        'label.onboarding-name-label',
        'What should we call you? (optional)',
        el('input.onboarding-name-input', {
          type: 'text',
          placeholder: 'Your name',
          onInput: (e) => (name = e.target.value),
          maxlength: '24',
        })
      ),
      el(
        'button.btn.btn-primary.btn-block',
        {
          onClick: () => {
            completeOnboarding(name.trim());
            plantSeed(selected);
            navigate(`#/root/${selected}`);
          },
        },
        'Plant my first seed'
      )
    );
  }

  render();
}
