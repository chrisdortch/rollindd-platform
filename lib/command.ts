import type { CentralCommandResult } from './types';
import { sampleSite, sampleTracks } from './sample-data';
import { analyzeLyrics, generateThemeFromLyrics } from './theme';

export function parseCentralCommand(raw: string) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const first = (lines[0] || '').toUpperCase();
  const values: Record<string, string> = {};

  for (const line of lines.slice(1)) {
    const idx = line.indexOf(':');
    if (idx > -1) {
      const key = line.slice(0