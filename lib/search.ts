import type { Track } from './types';

function clean(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function searchLyrics(tracks: Track[], query: string, exact = false) {
  const q = clean(query.replace(/^"/, '').replace(/"$/, ''));
  if (!q) return tracks;
  return tracks.filter(function (track) {
    return clean(track.title + ' ' + track.lyrics).includes(q);
  });
}

export function snippetFor(track: Track, query: string) {
  return track.lyrics.replace