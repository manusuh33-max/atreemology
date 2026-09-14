import { el, mount } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { ROOTS } from '../data/roots.js';
import { getState } from '../state/store.js';
import { isPlanted } from '../state/storage.js';
import { rootStats, forestSummary } from '../state/selectors.js';
import { earnedAchievements } from '../data/achievements.js';
import { openRewardSheet } from '../ui/rewardSheet.js';
import { navigate } from '../router.js';

export function renderRewards(container) {
  const state = getState();
  const earnedCount = state.rewardsClaimed.length;
  const summary = forestSummary(state);
  const badges = earnedAchievements(summary, state);
  const earnedBadgeCount = badges.filter((b) => b.earned).length;

  const view = el(
    'div.screen.rewards-screen',
    el('header.screen-header', el('h1', 'Rewards'), el('p.screen-sub', `${earnedCount} tree rewards · ${earnedBadgeCount}/${badges.length} milestone badges`)),
    el(
      'div.streak-milestones',
      el('h2', 'Streak'),
      el('div.streak-display.streak-display--big', icon('flame', 26), el('span.streak-number', state.streak.current), el('span.streak-longest', `Best: ${state.streak.longest}`))
    ),
    el(
      'section.home-section',
      el('h2', 'Milestone badges'),
      el(
        'div.badge-grid',
        badges.map((b) =>
          el(
            `div.milestone-badge${b.earned ? '.earned' : ''}`,
            el('span.milestone-badge-icon', b.earned ? b.icon : '🔒'),
            el('span.milestone-badge-label', b.label)
          )
        )
      )
    ),
    el('h2.tree-rewards-heading', 'Tree rewards'),
    el(
      'div.reward-grid',
      ROOTS.map((root) => {
        const claimed = state.rewardsClaimed.includes(root.id);
        const planted = isPlanted(state, root.id);
        const stats = planted ? rootStats(state, root.id) : null;
        return el(
          `div.reward-tile${claimed ? '.earned' : '.locked'}`,
          {
            onClick: () => {
              if (claimed) openRewardSheet({ root, onClose: () => {} });
              else navigate(planted ? `#/root/${root.id}` : '#/seeds');
            },
            role: 'button',
            tabindex: '0',
          },
          el('span.reward-tile-icon', claimed ? root.reward.icon : '🔒'),
          el('span.reward-tile-title', claimed ? root.reward.title : root.displayRoot),
          !claimed ? el('span.reward-tile-hint', planted ? `${stats.mastery}% there` : 'Not planted') : null
        );
      })
    )
  );

  mount(container, view);
}
