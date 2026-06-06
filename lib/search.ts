import type { Track } from './types';

function clean(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function removeQuotes(value: string) {
  return value.replace(/^"/, '').replace(/"$/, '');
}

function removeBracketedText(value: string) {
  return value.replace(/\[[^\]]+\]/g, ' ');
}

export function searchLyrics(tracks: Track[], query: string, exact = false) {
  const q = clean(removeQuotes(query));
  if (!q) return tracks;

  return tracks.filter((track) => {
    const haystack = clean(track.title + ' ' + removeBracketedText(track.lyrics));
    if (exact) return haystack.includes(q);
    return q.split(' ').every((term) => haystack.includes(term));
  });
}

export function snippetFor(track: Track, query: string) {
  const lyrics = removeBracketedText(track.lyrics).replace(/\n/g, ' ');
  const q = clean(removeQuotes(query));
  if (!q) return lyrics.slice(0, 180);

  const index = lyrics.toLowerCase().indexOf(q);
  const start = Math.max(index - 60, 0);
  return lyrics.slice(start, start + 180);
}

export function highlightSnippet(snippet: string, query: string) {
  const q = clean(removeQuotes(query));
  if (!q) return snippet;

  return snippet.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
}
