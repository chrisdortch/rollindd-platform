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
  if (!q) return tracks;

  return tracks.filter((track) => {
    const haystack = normalizeText(`${track.title} ${track.lyrics}`);
    if (exact) return haystack.includes(q);
    return q.split(' ').every((term) => haystack.includes(term));
  });
}
