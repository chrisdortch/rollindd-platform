import type { Track } from './types';

function clean(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function removeQuotes(value: string) {
  return value.replace(/^"/, '').replace(/"$/, '');
}

export function searchLyrics(tracks: Track[], query: string, exact = false) {
  const q = clean(removeQuotes(query));
  if (!q) return tracks;

  return tracks.filter((track) => {
    const haystack = clean(track.title + ' ' + track.lyrics);
    if (exact) return haystack.includes(q);
    return q.split(' ').every((term) => haystack.includes(term));
  });
}

export function snippetFor(track: Track, query: string) {
  return track.lyrics.replace(/\n/g, ' ').slice(0, 180);
}

export function highlightSnippet(snippet: string, query: string) {
  return snippet;
}
