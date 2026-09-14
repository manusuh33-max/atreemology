import { el } from './dom.js';
import { icon } from './icons.js';
import { isPlanted } from '../state/storage.js';
import { rootStats, isRootUnlocked, unlockHint, rootBridgePartners } from '../state/selectors.js';
import { healthLabel } from '../state/srs.js';
import { getRoot } from '../data/roots.js';

const STAGE_LABEL = {
  seed: 'Seed',
  sprout: 'Sprout',
  trunk: 'Trunk',
  branches: 'Branching',
  leaves: 'Leafing',
  flowering: 'Flowering',
  complete: 'Complete',
};

/**
 * A card for one root family, used in the Seed Library and Forest views.
 * @param {{root: object, state: object, onOpen: (id:string)=>void, onPlant: (id:string)=>void}} opts
 */
export function renderRootCard({ root, state, onOpen, onPlant }) {
  const planted = isPlanted(state, root.id);
  const unlocked = isRootUnlocked(state, root);
  const stats = planted ? rootStats(state, root.id) : null;
  const health = stats ? healthLabel(stats.health) : null;
  const bridges = rootBridgePartners(root.id);

  const card = el(
    'article.root-card',
    { class: planted ? 'planted' : unlocked ? 'unplanted' : 'root-locked' },
    el(
      'div.root-card-top',
      el('span.root-card-emblem', unlocked ? root.reward.icon : '🔒'),
      el(
        'div.root-card-heading',
        el('h3', root.root),
        el('p.root-card-meaning', `"${root.meaning}" — ${root.language}`)
      ),
      el('span.difficulty', { 'aria-label': `Difficulty ${root.difficulty} of 3` }, '●'.repeat(root.difficulty) + '○'.repeat(3 - root.difficulty))
    ),
    el('p.root-card-category', `${root.category} · ${root.tier}`),
    bridges.length
      ? el(
          'p.root-card-bridges',
          '🌿 Combines with ',
          [...new Set(bridges.map((b) => b.rootId))].map((id) => getRoot(id).displayRoot).join(', '),
          ` (${[...new Set(bridges.map((b) => b.wordId))].join(', ')})`
        )
      : null,
    !unlocked
      ? el('p.root-card-hint', unlockHint(state, root))
      : planted
      ? el(
          'div.root-card-progress',
          el('div.progress-row',
            el('span.progress-label', STAGE_LABEL[stats.stage]),
            el('span.progress-label', `${stats.mastery}% mastery`)
          ),
          el('div.progress-bar', el('div.progress-bar-fill', { style: { width: `${stats.mastery}%` } })),
          el('div.root-card-meta',
            el(`span.health-tag.health-${health.tone}`, health.label),
            stats.dueWords.length ? el('span.due-tag', `${stats.dueWords.length} due`) : null
          )
        )
      : el('p.root-card-hint', (() => {
          const n = root.connectorWordIds.length + root.commonWordIds.length + root.advancedWordIds.length;
          return `${n} word${n === 1 ? '' : 's'} to grow`;
        })()),
    el(
      'button.btn.btn-block',
      {
        class: planted ? 'btn-secondary' : 'btn-primary',
        disabled: !unlocked,
        onClick: () => (planted ? onOpen(root.id) : onPlant(root.id)),
      },
      !unlocked ? 'Locked' : planted ? 'Tend this tree' : 'Plant this seed',
      unlocked ? icon('chevronRight', 18) : null
    )
  );
  return card;
}
