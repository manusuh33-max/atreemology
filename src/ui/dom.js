// Atreemology — minimal hyperscript helper.
// el('button.btn', { onClick: fn, 'aria-label': 'Water tree' }, 'Water')
// Keeps every "component" a plain function that returns a real DOM node —
// no virtual DOM, no build step, no framework to install.

export function el(tag, props, ...children) {
  // Parse things like 'div.card.highlight#panel-1' or 'span#count' or
  // 'button.chip.chip-active' where '.' and '#' tokens can appear in any order.
  const tokenMatches = tag.match(/[.#]?[^.#]+/g) || [tag];
  const nameOnly = tokenMatches[0].startsWith('.') || tokenMatches[0].startsWith('#') ? 'div' : tokenMatches.shift();
  const classes = [];
  let id;
  for (const token of tokenMatches) {
    if (token.startsWith('.')) classes.push(token.slice(1));
    else if (token.startsWith('#')) id = token.slice(1);
  }
  const node = document.createElement(nameOnly || 'div');
  if (id) node.id = id;
  if (classes.length) node.className = classes.join(' ');

  if (props && typeof props === 'object' && !Array.isArray(props) && !(props instanceof Node)) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key === 'class' || key === 'className') {
        node.className = [node.className, value].filter(Boolean).join(' ');
      } else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'html') {
        node.innerHTML = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(node.style, value);
      } else if (key === 'ref' && typeof value === 'function') {
        value(node);
      } else if (typeof value === 'boolean') {
        if (value) node.setAttribute(key, '');
      } else {
        node.setAttribute(key, value);
      }
    }
  } else if (props != null) {
    children.unshift(props);
  }

  for (const child of children.flat(Infinity)) {
    appendChild(node, child);
  }
  return node;
}

function appendChild(node, child) {
  if (child == null || child === false) return;
  if (child instanceof Node) {
    node.appendChild(child);
  } else {
    node.appendChild(document.createTextNode(String(child)));
  }
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function mount(container, node) {
  clear(container);
  container.appendChild(node);
}

export function fragment(...children) {
  const frag = document.createDocumentFragment();
  for (const child of children.flat(Infinity)) appendChild(frag, child);
  return frag;
}

export function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
