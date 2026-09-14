// Atreemology — small inline SVG icons. No icon font, no CDN, no dependency.
// Each function returns raw SVG markup sized to currentColor so it inherits text color.

function svg(paths, viewBox = '0 0 24 24') {
  return `<svg viewBox="${viewBox}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${paths}</svg>`;
}

export const icons = {
  leaf: svg('<path d="M4 14C4 7 9 3 20 3C20 14 16 20 8 20C6.5 20 5 19.3 4 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 20C4 16 6 13 11 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
  droplet: svg('<path d="M12 3C12 3 6 10.5 6 15a6 6 0 0 0 12 0c0-4.5-6-12-6-12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'),
  flame: svg('<path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1-0.5-1.7-1-2 1 3 3 4 3 7a5 5 0 0 1-10 0C7 10 10 8 12 2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'),
  gift: svg('<rect x="4" y="9" width="16" height="11" rx="1.5" stroke="currentColor" stroke-width="1.6"/><path d="M4 9h16v3.5H4V9Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 9v11M12 9C10 6 7 5.5 7 8s3 1 5 1ZM12 9c2-3 5-3.5 5-1s-3 1-5 1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'),
  check: svg('<path d="M4 12.5l5 5L20 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
  chevronRight: svg('<path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
  chevronLeft: svg('<path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
  home: svg('<path d="M4 11.5 12 4l8 7.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9.5h12V10" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>'),
  seed: svg('<path d="M12 21c-4 0-7-3-7-7 0-5 7-11 7-11s7 6 7 11c0 4-3 7-7 7Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>'),
  forest: svg('<path d="M7 14 4 20h6l-3-6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M16 10l-4.5 10h9L16 10Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M9 4 6 9h6L9 4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'),
  reward: svg('<circle cx="12" cy="9" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M8.5 13.5 7 21l5-2.5L17 21l-1.5-7.5" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'),
  profile: svg('<circle cx="12" cy="8" r="3.4" stroke="currentColor" stroke-width="1.6"/><path d="M4.5 20c1.4-4 4-5.8 7.5-5.8s6.1 1.8 7.5 5.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'),
  book: svg('<path d="M4 5.5C4 4.7 4.7 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M20 5.5c0-.8-.7-1.5-1.5-1.5H12v16h6.5a1.5 1.5 0 0 0 1.5-1.5v-13Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'),
  sparkle: svg('<path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>'),
  compass: svg('<circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6"/><path d="M15 9l-2 5-4.5 1.5 2-5L15 9Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
};

export function icon(name, size = 22) {
  const wrap = document.createElement('span');
  wrap.className = 'icon';
  wrap.style.width = wrap.style.height = `${size}px`;
  wrap.innerHTML = icons[name] || '';
  return wrap;
}
