import { NextRequest, NextResponse } from 'next/server';
import { sampleTracks } from '@/lib/sample-data';
import { searchLyrics, snippetFor } from '@/lib/search';

export async function POST(request: NextRequest) {
  const { query, exact } = await request.json();
  const results = searchLyrics(sampleTracks, String(query || ''), Boolean(exact));
  return NextResponse.json({ results: results.map((track) => ({ ...track, snippet: snippetFor(track, String(query || '')) })) });
}
