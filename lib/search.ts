import type { Track } from './types';

export function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function stripQuotes(value: string) {
  return value.trim().replace(/^"/, '').replace(/"$/, '');
}

export function searchLyrics(tracks: Track[], query: string, exact = false) {
  const q = normalizeText(stripQuotes(query));
  if (!q) return tracks;
  return tracks.filter((track) => {
    const haystack = normalizeText(track