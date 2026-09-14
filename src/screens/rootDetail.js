import { el, mount } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { getRoot } from '../data/roots.js';
import { getWord } from '../data/words.js';
import { getState, markWordSeen, reviewWordAction, claimReward, plantSeed } from '../state/store.js';
import { isPlanted } from '../state/storage.js';
import { rootStats, nextUnlearnedWord, isRootUnlocked, unlockHint } from '../state/selectors.js';
import { healthLabel } from '../state/srs.js';
import { renderRootTree } from '../ui/rootTree.js';
import { openWordSheet } from '../ui/wordSheet.js';
import { openRewardSheet } from '../ui/rewardSheet.js';
import { navigate } from '../router.js';
import { renderSprig, sprigLine } from '../ui/sprig.js';

const STAGE_COPY = {
  seed: 'Just planted. Start with the connector words — the innermost branches, closest to the trunk.',
  sprout: 'Sprouting — a few connector words still to learn.',
  trunk: 'The trunk has taken hold. Time for common words.',
  branches: 'Branching out through the common vocabulary.',
  leaves: 'Fully leafed. Ready for advanced words.',
  flowering: 'Flowering — almost fully mastered.',
  complete: 'Complete! This tree has fully grown.',
};

export function renderRootDetail(container, rootId) {
  const root = getRoot(rootId);
  if (!root) {
    mount(container, el('div.screen', el('p', 'That root could not be found.'), el('button.btn.btn-primary', { onClick: () => navigate('#/seeds') }, 'Back to Seed Library')));
    return;
  }

  function draw() {
    const state = getState();
    const planted = isPlanted(state, rootId);

    if (!planted) {
      mount(container, renderPlantPrompt());
      return;
    }

    const stats = rootStats(state, rootId);
    const health = healthLabel(stats.health);
    const nextWord = nextUnlearnedWord(state, rootId);
    const rewardClaimed = state.rewardsClaimed.includes(rootId);

    const treeHost = el('div.tree-canvas');
    treeHost.appendChild(
      renderRootTree({
        root,
        wordStats: state.wordStats,
        onSelect: (wordId) => openWord(wordId),
      })
    );

    const view = el(
      'div.screen.root-detail-screen',
      el(
        'header.screen-header',
        el('button.icon-btn.back-btn', { onClick: () => navigate('#/forest'), 'aria-label': 'Back' }, icon('chevronLeft', 20)),
        el('h1', root.root),
        el('p.screen-sub', `"${root.meaning}" — ${root.language}`)
      ),
      el('p.origin-note', root.originNote),
      el(
        'div.root-detail-badges',
        el(`span.badge.health-${health.tone}`, health.label),
        el('span.badge', `${stats.mastery}% mastery`),
        el('span.badge', STAGE_COPY_LABEL(stats.stage))
      ),
      el('p.stage-copy', STAGE_COPY[stats.stage]),
      treeHost,
      renderSprig(nextWord ? sprigLine('planted', root.root) : null, { calmMode: state.profile.calmMode }),
      el(
        'div.root-detail-actions',
        nextWord
          ? el('button.btn.btn-primary.btn-block', { onClick: () => openWord(nextWord) }, icon('leaf', 18), `Learn "${getWord(nextWord).word}"`)
          : rewardClaimed
          ? el('button.btn.btn-secondary.btn-block', { onClick: () => navigate('#/rewards') }, icon('reward', 18), 'View your reward')
          : el('button.btn.btn-primary.btn-block', {
              onClick: () => {
                claimReward(rootId);
                openRewardSheet({ root, onClose: draw });
              },
            }, icon('gift', 18), 'Claim your reward'),
        stats.mastery > 0 || !nextWord
          ? el('button.btn.btn-secondary.btn-block', { onClick: () => navigate(`#/quiz/${rootId}`) }, icon('sparkle', 18), 'Practice this tree')
          : null
      )
    );

    mount(container, view);

    function openWord(wordId) {
      openWordSheet({
        wordId,
        rootId,
        state: getState(),
        onLearn: () => {
          markWordSeen(rootId, wordId);
          draw();
        },
        onReview: (rating) => {
          reviewWordAction(rootId, wordId, rating);
          draw();
        },
      });
    }
  }

  function renderPlantPrompt() {
    const state = getState();
    const unlocked = isRootUnlocked(state, root);
    return el(
      'div.screen.root-detail-screen',
      el(
        'header.screen-header',
        el('button.icon-btn.back-btn', { onClick: () => navigate('#/seeds'), 'aria-label': 'Back' }, icon('chevronLeft', 20)),
        el('h1', root.root),
        el('p.screen-sub', `"${root.meaning}" — ${root.language}`)
      ),
      el('p.origin-note', root.originNote),
      unlocked
        ? el(
            'div.empty-state',
            el('div.empty-state-art', '🌰'),
            el('p', 'This seed has not been planted yet.'),
            el('button.btn.btn-primary.btn-block', { onClick: () => { plantSeed(rootId); draw(); } }, icon('seed', 18), 'Plant this seed')
          )
        : el(
            'div.empty-state',
            el('div.empty-state-art', '🔒'),
            el('p', `This ${root.tier.toLowerCase()}-tier root is still locked.`),
            el('p.screen-sub', unlockHint(state, root)),
            el('button.btn.btn-secondary.btn-block', { onClick: () => navigate('#/seeds') }, 'Back to Seed Library')
          )
    );
  }

  draw();
}

function STAGE_COPY_LABEL(stage) {
  const map = { seed: 'Seed', sprout: 'Sprout', trunk: 'Trunk', branches: 'Branches', leaves: 'Leaves', flowering: 'Flowering', complete: 'Complete' };
  return map[stage] ?? stage;
}
