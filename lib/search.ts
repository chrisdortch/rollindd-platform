import type { Track } from './types';

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9'"\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchLyrics(tracks: Track[], query: string, exact = false) {
  const q = normalizeText(query.replace(/^"|"$/g, ''));
