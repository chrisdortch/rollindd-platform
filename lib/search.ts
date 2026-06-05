import type { Track } from './types';

export function normalizeText(value: string) {
  return value.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^a-z0-9'"\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function searchLyrics(tracks: Track[], query: string, exact = false) {
  const q = normalizeText(query.replace(/^"|"$/g, ''));
  if (!q) return tracks;
  return tracks.filter((track) => {
    const haystack = normalizeText(`${track.title} ${track.lyrics}`);
    if (exact) return haystack.includes(q);
    return q.split(' ').every((term) => haystack.includes(term));
  });
}

export function snippetFor(track: Track, query: string) {
  const cleanQuery = query.replace(/^"|"$/g, '').trim();
  if (!cleanQuery) return track.lyrics.split('
').slice(0, 2).join(' ');
  const lines = track.lyrics.split('
').filter(Boolean);
  const normalizedQuery = normalizeText(cleanQuery);
  const match = lines.find((line) => normalizeText(line).includes(normalizedQuery)) || lines.find((line) => normalizedQuery.split(' ').some((term) => normalizeText(line).includes(term))) || lines[0] || '';
  return match;
}

export function highlightSnippet(snippet: string, query: string) {
  const clean = query.replace(/^"|"$/g, '').trim();
  if (!clean) return snippet;
  const escaped = clean.replace(/[.*+?^${}()|[\]\]/g, '\$&');
  return snippet.replace(new RegExp(`(${escaped})`, 'ig'), '<mark>$1</mark>');
}
