import { el } from './dom.js';
import { icon } from './icons.js';

/**
 * Celebration / detail modal for a completed tree's reward.
 */
export function openRewardSheet({ root, onClose }) {
  const overlay = el('div.sheet-overlay', { role: 'presentation' });
  const close = () => {
    overlay.remove();
    onClose?.();
  };
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  const sheet = el(
    'div.sheet.reward-sheet',
    { role: 'dialog', 'aria-modal': 'true', 'aria-label': `Reward: ${root.reward.title}` },
    el('div.sheet-grabber'),
    el('div.reward-icon-big', root.reward.icon),
    el('h2.sheet-word', root.reward.title),
    el('p.reward-earned-from', `Earned for completing the ${root.root} tree`),
    el('p.sheet-definition', root.reward.description),
    el('button.btn.btn-primary.btn-block', { onClick: close }, icon('check', 18), 'Keep growing')
  );

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  return close;
}
