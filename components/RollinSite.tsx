'use client';

import { useMemo, useState } from 'react';
import type { Site, Track } from '@/lib/types';
import { highlightSnippet, searchLyrics, snippetFor } from '@/lib/search';

function formatTime(seconds?: number) {
  if (!seconds) return '3:47';
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function RollinSite({ site }: { site: Site }) {
  const [query, setQuery] = useState('');
  const [exact, setExact] = useState(true);
  const [selected, set