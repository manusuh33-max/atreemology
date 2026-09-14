// Etymon — the interactive root tree. An explanatory map, not decoration.
// Below ground there is exactly one thing: the root itself — the bound
// morpheme (e.g. "spect") that cannot stand alone as a word, drawn as a
// single taproot converging on one labeled point. It has no words attached
// to it below ground, because a root isn't a word; it's what every word on
// the tree is built FROM. Every actual word the root produces — including
// the handful of close, simple words that make the root click — is a real
// word, so it grows as a branch above ground, never underground: connector
// words fill the innermost/lowest canopy nearest the trunk, common words
// the mid canopy, and advanced words the outer canopy. Node size/glow
// scales with that word's mastery. A word built from two different roots
// at once (e.g. "inspect" from both "in-" and "spect") isn't split across
// one tree — it's a shared node/branch that bridges both trees, drawn as a
// literal connecting branch in the Forest tab (see
// selectors.js#sharedWordRootIds, screens/forest.js#renderBridgeBranches).

import { rootWordOrder } from '../data/roots.js';
import { getWord } from '../data/words.js';
import { isDue } from '../state/srs.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 320;
const H = 460;
const GROUND_Y = 240;
const BASE = { x: W / 2, y: GROUND_Y };

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function polar(cx, cy, angleDeg, radius) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

// A canopy tier is a flattened arc, not a true circle: x follows the fan
// angle (wide horizontal spread) while y rises only by `rise` at most, no
// matter how many words are in the tier or how close an angle lands to
// straight up. A true circular fan (rise === radius) pushes the middle
// word of any odd-sized tier — which always lands near 0deg, i.e. due
// north — up by the FULL radius, and with 3+ tiers stacked above a trunk
// that only has ~90px of headroom before the top of the illustration,
// that middle word ends up clipped off the canvas entirely. Flattening
// the vertical component keeps every word on-canvas regardless of tier
// size, while `spread` still gives each tier as wide a fan as it likes.
function canopyPoint(cx, cyBase, angleDeg, spread, rise) {
  const rad = angleDeg * (Math.PI / 180);
  return { x: cx + spread * Math.sin(rad), y: cyBase - rise * Math.cos(rad) };
}

function spreadAngles(count, min, max, seedBase) {
  if (count === 1) return [(min + max) / 2 + (((hashStr(seedBase) % 10) - 5) * 0.6)];
  const angles = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const base = min + t * (max - min);
    const jitter = ((hashStr(seedBase + i) % 10) - 5) * 0.8;
    angles.push(base + jitter);
  }
  return angles;
}

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function curvePath(from, to, bulge = 0.35, downward = false) {
  const midX = (from.x + to.x) / 2 + (to.x - from.x) * bulge * (downward ? -1 : 1) * 0.2;
  const midY = (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;
}

function masteryVisual(stat, level) {
  const learned = Boolean(stat?.learned);
  const mastery = stat?.mastery ?? 0;
  const due = learned && isDue(stat);
  if (!learned) return { state: 'bud', radius: 6, fill: 'var(--bud-fill)', stroke: 'var(--bud-stroke)' };
  if (due) return { state: 'due', radius: 9 + mastery / 20, fill: 'var(--due-fill)', stroke: 'var(--due-stroke)' };
  if (mastery >= 70 && level === 'advanced') return { state: 'flower', radius: 11, fill: 'var(--flower-fill)', stroke: 'var(--flower-stroke)' };
  if (mastery >= 70) return { state: 'bright', radius: 10, fill: 'var(--leaf-bright)', stroke: 'var(--leaf-stroke)' };
  if (mastery >= 35) return { state: 'growing', radius: 8.5, fill: 'var(--leaf-mid)', stroke: 'var(--leaf-stroke)' };
  return { state: 'new', radius: 7.5, fill: 'var(--leaf-new)', stroke: 'var(--leaf-stroke)' };
}

/**
 * @param {object} opts
 * @param {import('../data/roots.js').RootFamily} opts.root
 * @param {Record<string, any>} opts.wordStats
 * @param {(wordId:string)=>void} opts.onSelect
 */
export function renderRootTree({ root, wordStats, onSelect }) {
  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`,
    class: 'root-tree',
    role: 'group',
    'aria-label': `${root.root} tree, meaning ${root.meaning}`,
  });

  const trunkTop = { x: BASE.x, y: 92 };

  // soil
  svg.appendChild(svgEl('rect', { x: 0, y: GROUND_Y, width: W, height: H - GROUND_Y, class: 'tree-soil' }));
  svg.appendChild(svgEl('line', { x1: 0, y1: GROUND_Y, x2: W, y2: GROUND_Y, class: 'tree-groundline' }));

  // trunk
  const trunkPath = `M ${BASE.x - 16} ${GROUND_Y} C ${BASE.x - 18} 190, ${BASE.x - 10} 150, ${trunkTop.x} ${trunkTop.y}
    C ${trunkTop.x + 10} 150, ${BASE.x + 18} 190, ${BASE.x + 16} ${GROUND_Y} Z`;
  svg.appendChild(svgEl('path', { d: trunkPath, class: 'tree-trunk' }));

  // The root itself: the one thing below ground — a single taproot
  // converging on one labeled point, the literal root morpheme (e.g.
  // "spect"). No words live down here; a root isn't a word.
  addRootConvergence(svg, BASE, root);

  // connector words: real words, so they're real branches — the innermost,
  // lowest tier of the canopy, closest to the trunk, since these are the
  // handful of simple words that make the root click.
  const connectorAngles = spreadAngles(root.connectorWordIds.length, -62, 62, root.id + 'c');
  root.connectorWordIds.forEach((wordId, i) => {
    const end = canopyPoint(trunkTop.x, trunkTop.y + 28, connectorAngles[i], 66 + (i % 3) * 10, 20 + (i % 2) * 6);
    addBranch(svg, { x: trunkTop.x, y: trunkTop.y + 36 }, end, wordId, 'connector', wordStats[wordId], onSelect, false);
  });

  // common words (mid canopy)
  const commonAngles = spreadAngles(root.commonWordIds.length, -70, 70, root.id + 'm');
  root.commonWordIds.forEach((wordId, i) => {
    const end = canopyPoint(trunkTop.x, trunkTop.y + 6, commonAngles[i], 104 + (i % 3) * 12, 30 + (i % 2) * 8);
    addBranch(svg, { x: trunkTop.x, y: trunkTop.y + 14 }, end, wordId, 'common', wordStats[wordId], onSelect, false);
  });

  // advanced words (outer canopy)
  const advAngles = spreadAngles(root.advancedWordIds.length, -74, 74, root.id + 'a');
  root.advancedWordIds.forEach((wordId, i) => {
    const end = canopyPoint(trunkTop.x, trunkTop.y - 12, advAngles[i], 122 + (i % 3) * 10, 40 + (i % 2) * 8);
    addBranch(svg, { x: trunkTop.x, y: trunkTop.y - 2 }, end, wordId, 'advanced', wordStats[wordId], onSelect, false);
  });

  return svg;
}

// Draws the taproot: a single path straight down from the trunk's base to
// one point that stands for the root itself — with root.displayRoot
// labeled just below it. This is the only thing below ground: a root is
// not a word, so no word-branches live down here — every word the root
// produces, however simple, is drawn as a branch above ground instead.
function addRootConvergence(svg, base, root) {
  const tip = { x: base.x, y: base.y + 150 };
  svg.appendChild(
    svgEl('path', {
      d: curvePath(base, tip, 0.08, true),
      class: 'tree-taproot',
      fill: 'none',
    })
  );
  svg.appendChild(svgEl('circle', { cx: tip.x, cy: tip.y, r: 4, class: 'tree-root-point' }));
  svg.appendChild(
    svgEl('text', {
      x: tip.x,
      y: tip.y + 24,
      class: 'tree-root-label',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    })
  ).textContent = root.displayRoot;
}

function addBranch(svg, from, to, wordId, level, stat, onSelect, downward) {
  const word = getWord(wordId);
  const visual = masteryVisual(stat, level);

  const path = svgEl('path', {
    d: curvePath(from, to, 0.4, downward),
    class: `tree-branch tree-branch--${level} tree-branch--${visual.state}`,
    fill: 'none',
  });
  svg.appendChild(path);

  const g = svgEl('g', {
    class: 'tree-node',
    tabindex: '0',
    role: 'button',
    'aria-label': `${word.word}${stat?.learned ? ', learned' : ', not yet learned'}`,
    transform: `translate(${to.x} ${to.y})`,
  });

  if (visual.state === 'due') {
    g.appendChild(svgEl('circle', { r: visual.radius + 5, class: 'tree-node-pulse' }));
  }

  g.appendChild(
    svgEl('circle', {
      r: visual.radius,
      fill: visual.fill,
      stroke: visual.stroke,
      'stroke-width': 1.6,
      class: 'tree-node-dot',
    })
  );

  if (visual.state === 'flower') {
    for (let p = 0; p < 5; p++) {
      const petal = polar(0, 0, p * 72, visual.radius * 0.9);
      g.appendChild(svgEl('circle', { cx: petal.x, cy: petal.y, r: 3.2, class: 'tree-node-petal' }));
    }
  }

  const activate = () => onSelect(wordId);
  g.addEventListener('click', activate);
  g.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate();
    }
  });

  svg.appendChild(g);
}
