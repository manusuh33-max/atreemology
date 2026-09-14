import { el } from './dom.js';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function renderJournalEntry(entry) {
  return el(
    'li.journal-entry',
    el('span.journal-date', formatDate(entry.date)),
    el('p.journal-text', entry.text)
  );
}

export function renderJournalList(entries, emptyText = 'Your field notes will appear here as you learn.') {
  if (!entries.length) return el('p.empty-hint', emptyText);
  return el('ul.journal-list', entries.map(renderJournalEntry));
}
