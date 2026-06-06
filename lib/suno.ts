import type { Track } from './types';

function collectStringPayloads(value: unknown, out: string[] = []) {
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStringPayloads(item, out));
    return out;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStringPayloads(item, out));
  }
  return out;
}

function parseNextFlightPayloads(value: unknown) {
  const parsed: unknown[] = [];
  const flightText = collectStringPayloads(value).join('\n');
  const rowPattern = /(?:^|\n)([0-9a-f]+):/gi;
  const rows = [...flightText.matchAll(rowPattern)];

  rows.forEach((row, index) => {
    const start = (row.index || 0) + row[0].length;
    const end = index + 1 < rows.length ? rows[index + 1].index || flightText.length : flightText.length;
    const payload = flightText.slice(start, end).trim();
    if (!payload || !/^[{["0-9tnf-]/.test(payload)) return;

    try {
      parsed.push(JSON.parse(payload));
    } catch {
      // Next Flight rows can contain references and partial frames. Skip rows that are not standalone JSON.
    }
  });

  return parsed;
}

function findJsonObjects(html: string) {
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const jsons: unknown[] = [];
  for (const script of scripts) {
    const trimmed = script.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try { jsons.push(JSON.parse(trimmed)); } catch {}
    }
    const nextData = trimmed.match(/self\.__next_f\.push\((.*)\)/s);
    if (nextData) {
      try {
        const parsed = JSON.parse(nextData[1]);
        jsons.push(parsed, ...parseNextFlightPayloads(parsed));
      } catch {}
    }
  }
  return jsons;
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function collectTracksFromAnyJson(value: unknown, out: Track[] = []): Track[] {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    value.forEach((v) => collectTracksFromAnyJson(v, out));
    return out;
  }
  const record = value as Record<string, unknown>;
  const metadata = record.metadata && typeof record.metadata === 'object' ? record.metadata as Record<string, unknown> : {};
  const audio = stringValue(record.audio_url) || stringValue(record.audioUrl);
  const video = stringValue(record.video_url) || stringValue(record.videoUrl);
  const title = stringValue(record.title) || (audio || video ? stringValue(record.name) : undefined);
  const lyrics = stringValue(record.lyrics) || stringValue(record.gpt_description_prompt) || stringValue(metadata.prompt);
  const image = stringValue(record.image_url) || stringValue(record.imageUrl) || stringValue(record.image_large_url) || stringValue(record.cover_url);
  const duration = numberValue(record.duration_seconds) || numberValue(record.duration) || numberValue(metadata.duration);
  if (title && (image || audio || video || lyrics)) {
    const id = String(record.id || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
    if (!out.some((t) => t.id === id)) {
      out.push({
        id,
        title,
        coverImageUrl: image || 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=80',
        audioUrl: audio,
        mp3Url: audio,
        videoUrl: video,
        durationSeconds: duration ? Math.round(duration) : undefined,
        lyrics: lyrics || '',
        sortOrder: out.length + 1,
        downloadable: Boolean(audio),
        sourceUrl: id ? `https://suno.com/song/${id}` : undefined,
        mediaStatus: audio || video ? 'complete' : lyrics ? 'partial' : 'missing_audio'
      });
    }
  }
  Object.values(record).forEach((v) => collectTracksFromAnyJson(v, out));
  return out;
}

export async function fetchSunoPlaylist(playlistUrl: string) {
  const result = {
    mode: 'failed' as 'public-parse' | 'failed',
    message: 'Public Suno metadata was not detected. Existing homepage data was left unchanged.',
    tracks: [] as Track[]
  };
  if (!playlistUrl || !/^https?:\/\//.test(playlistUrl)) return result;
  try {
    const response = await fetch(playlistUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 RollinDDPlaylistFetcher/0.1',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      next: { revalidate: 60 }
    });
    if (!response.ok) return { ...result, message: `Suno fetch returned HTTP ${response.status}. Existing homepage data was left unchanged.` };
    const html = await response.text();
    const jsons = findJsonObjects(html);
    const tracks = jsons.flatMap((json) => collectTracksFromAnyJson(json)).filter((t) => t.title);
    if (tracks.length) {
      return { mode: 'public-parse' as const, message: `Parsed ${tracks.length} track-like records from public page. Review before production use.`, tracks };
    }
    return result;
  } catch (error) {
    return { ...result, mode: 'failed' as const, message: error instanceof Error ? error.message : 'Unknown Suno fetch error.' };
  }
}
