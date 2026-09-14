import { el, mount } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { getState, markWordSeen, reviewWordAction } from '../state/store.js';
import { plantedRoots } from '../state/storage.js';
import { renderRootCard } from '../ui/rootCard.js';
import { rootStats, forestBridges } from '../state/selectors.js';
import { getRoot } from '../data/roots.js';
import { getWord } from '../data/words.js';
import { openWordSheet } from '../ui/wordSheet.js';
import { navigate } from '../router.js';

// Scattered planting spots across the landscape scene, as percentages of the
// scene's width/height. Reused round-robin once a forest has more trees than
// slots, so the scene never runs out of places to plant.
const FOREST_SLOTS = [
  { x: 12, y: 70 }, { x: 30, y: 80 }, { x: 50, y: 68 }, { x: 68, y: 82 }, { x: 86, y: 66 },
  { x: 22, y: 50 }, { x: 42, y: 58 }, { x: 60, y: 48 }, { x: 78, y: 56 }, { x: 92, y: 44 },
  { x: 10, y: 88 }, { x: 36, y: 92 }, { x: 56, y: 86 }, { x: 74, y: 92 }, { x: 90, y: 84 },
  { x: 18, y: 34 }, { x: 46, y: 36 }, { x: 64, y: 32 }, { x: 82, y: 30 },
];

function growthEmoji(mastery, stage) {
  if (stage === 'complete' || mastery >= 80) return '🌳';
  if (mastery >= 40) return '🌿';
  if (mastery > 0) return '🌱';
  return '🌫️';
}

export function renderForest(container) {
  const state = getState();
  const planted = plantedRoots(state);

  const view = el(
    'div.screen.forest-screen',
    el('header.screen-header', el('h1', 'Your Forest'), el('p.screen-sub', planted.length ? `${planted.length} tree${planted.length === 1 ? '' : 's'} growing` : 'Nothing planted yet')),
    planted.length === 0
      ? el(
          'div.empty-state',
          el('div.empty-state-art', '🌾'),
          el('p', "Your forest is an open field right now. Plant a seed from the Seed Library to begin."),
          el('button.btn.btn-primary', { onClick: () => navigate('#/seeds') }, 'Go to Seed Library')
        )
      : renderLandscape(planted, state, () => renderForest(container)),
    planted.length >= 2 ? renderConstellationNote(state) : null,
    planted.length > 0
      ? el(
          'section.home-section',
          el('h2', 'All roots'),
          el('div.root-card-grid', planted.map((root) => renderRootCard({ root, state, onOpen: (id) => navigate(`#/root/${id}`), onPlant: () => {} })))
        )
      : null
  );

  mount(container, view);
}

// A bridge word's two curve endpoints (a, b are {x,y} percentages) plus the
// point where its label sits — shared by the SVG branch and the HTML label
// so they always agree on where the "branch" actually runs.
function bridgeCurve(a, b) {
  const cx = (a.x + b.x) / 2;
  const cy = Math.min(a.y, b.y) - 22;
  const labelX = 0.25 * a.x + 0.5 * cx + 0.25 * b.x;
  const labelY = 0.25 * a.y + 0.5 * cy + 0.25 * b.y - 4;
  return { d: `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`, labelX, labelY };
}

// Expands each bridge word (which may in principle span more than 2 roots)
// into one entry per pair of its currently-planted parent roots.
function bridgeSegments(bridges) {
  const segments = [];
  for (const bridge of bridges) {
    for (let i = 0; i < bridge.rootIds.length; i++) {
      for (let j = i + 1; j < bridge.rootIds.length; j++) {
        segments.push({ wordId: bridge.wordId, aId: bridge.rootIds[i], bId: bridge.rootIds[j] });
      }
    }
  }
  return segments;
}

function renderLandscape(planted, state, onChange) {
  const visible = planted.slice(0, FOREST_SLOTS.length);
  const slotFor = new Map(visible.map((root, i) => [root.id, FOREST_SLOTS[i % FOREST_SLOTS.length]]));
  const bridges = forestBridges(state).filter((b) => b.rootIds.every((id) => slotFor.has(id)));
  const segments = bridgeSegments(bridges);

  function openBridgeWord(wordId, rootId) {
    openWordSheet({
      wordId,
      rootId,
      state: getState(),
      onLearn: () => { markWordSeen(rootId, wordId); onChange(); },
      onReview: (rating) => { reviewWordAction(rootId, wordId, rating); onChange(); },
    });
  }

  return el(
    'div.forest-scene',
    el('div.forest-sun'),
    el('div.forest-hill.forest-hill--back'),
    el('div.forest-hill.forest-hill--front'),
    renderBridgeBranches(segments, slotFor),
    el(
      'div.forest-scene-trees',
      visible.map((root, i) => {
        const stats = rootStats(state, root.id);
        const slot = slotFor.get(root.id);
        return el(
          'button.scene-tree',
          {
            style: { left: `${slot.x}%`, top: `${slot.y}%`, zIndex: String(Math.round(slot.y)) },
            onClick: () => navigate(`#/root/${root.id}`),
            'aria-label': `Open ${root.root}, ${stats.mastery}% mastery`,
          },
          el('span.scene-tree-emoji', growthEmoji(stats.mastery, stats.stage)),
          stats.dueWords.length ? el('span.scene-tree-due', { 'aria-label': `${stats.dueWords.length} due` }) : null
        );
      })
    ),
    renderBridgeLabels(segments, slotFor, state, openBridgeWord)
  );
}

// The literal branch: an SVG curve connecting two planted trees' positions,
// for every word that grows from both of their roots at once.
function renderBridgeBranches(segments, slotFor) {
  if (!segments.length) return null;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'forest-bridges');
  svg.setAttribute('aria-hidden', 'true');
  for (const seg of segments) {
    const a = slotFor.get(seg.aId);
    const b = slotFor.get(seg.bId);
    const curve = bridgeCurve(a, b);
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', curve.d);
    path.setAttribute('class', 'forest-bridge-path');
    svg.appendChild(path);
  }
  return svg;
}

// The word itself, sitting where its branch crosses — click it to open the
// same word sheet used inside a single tree's lesson.
function renderBridgeLabels(segments, slotFor, state, openBridgeWord) {
  if (!segments.length) return null;
  return el(
    'div.forest-bridge-labels',
    segments.map((seg, i) => {
      const a = slotFor.get(seg.aId);
      const b = slotFor.get(seg.bId);
      const curve = bridgeCurve(a, b);
      // A hub root (tele bridges to 4 others) puts several labels near the
      // same spot — stagger them into a small vertical cascade so a busy
      // scene stays readable instead of piling every label on one point.
      const stagger = Math.ceil((i + 1) / 2) * (i % 2 === 0 ? -6 : 6);
      const word = getWord(seg.wordId);
      const learned = Boolean(state.wordStats[seg.wordId]?.learned);
      return el(
        `button.forest-bridge-label${learned ? '.forest-bridge-label--learned' : ''}`,
        {
          style: { left: `${curve.labelX}%`, top: `${curve.labelY + stagger}%` },
          onClick: () => openBridgeWord(seg.wordId, seg.aId),
          'aria-label': `${word.word}: bridges the ${getRoot(seg.aId).displayRoot} and ${getRoot(seg.bId).displayRoot} trees`,
        },
        icon('sparkle', 12),
        word.word
      );
    })
  );
}

function renderConstellationNote(state) {
  const bridges = forestBridges(state);
  if (!bridges.length) return null;
  return el(
    'section.home-section.constellation-note',
    el('h2', icon('sparkle', 18), 'Forest constellation'),
    el('p.screen-sub', 'These words are drawn as branches connecting two trees right in the scene above — proof the roots really do connect.'),
    el(
      'ul.constellation-list',
      bridges.map((b) =>
        el(
          'li',
          el('strong', getWord(b.wordId).word),
          ' bridges ',
          b.rootIds.map((id) => getRoot(id).displayRoot).join(' & ')
        )
      )
    )
  );
}
