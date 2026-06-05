import type { Track } from './types';

const clean = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

export function searchLyrics(tracks: Track[], query: string, exact = false) {
  const q = clean(query.replace(/^"/, '').replace(/"$/, ''));
  if (!q) return tracks;
  return tracks.filter((track) => clean(track.title + ' ' + track.lyrics).includes(q));
}

export function snippetFor(track: Track, query: string) {
  const text = track.lyrics.replace(/\n/g, ' ');
  return text.slice(0, 180);
}

export function highlightSnippet(snippet: string, query: string) {
  return