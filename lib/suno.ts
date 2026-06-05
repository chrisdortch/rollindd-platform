import type { Track } from './types';
import { sampleTracks } from './sample-data';

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
      try { jsons.push(JSON.parse(nextData[1])); } catch {}
    }
  }
  return jsons;
}

function collectTracksFromAnyJson(value: unknown, out: Track[] = []): Track[] {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    value.forEach((v) => collectTracksFromAnyJson(v, out));
    return out;
  }
  const record = value as Record<string, unknown>;
  const title = typeof record.title === 'string' ? record.title : typeof record.name === 'string' ? record.name : undefined;
  const lyrics = typeof record.lyrics === 'string' ? record.lyrics : typeof record.gpt_description_prompt === 'string' ? record.gpt_description_prompt : undefined;
  const image = typeof record.image_url === 'string' ? record.image_url : typeof record.imageUrl === 'string' ? record.imageUrl : typeof record.cover_url === 'string' ? record.cover_url : undefined;
  const audio = typeof record.audio_url === 'string' ? record.audio_url : typeof record.audioUrl === 'string' ? record.audioUrl : undefined;
  const video = typeof record.video_url === 'string' ? record.video_url : typeof record.videoUrl === 'string' ? record.videoUrl : undefined;
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
        lyrics: lyrics || '',
        sortOrder: out.length + 1,
        downloadable: Boolean(audio),
        mediaStatus: audio || video ? 'complete' : lyrics ? 'partial' : 'missing_audio'
      });
    }
  }
  Object.values(record).forEach((v) => collectTracksFromAnyJson(v, out));
  return out;
}

export async function fetchSunoPlaylist(playlistUrl: string) {
  const result = {
    mode: 'fallback-demo' as 'public-parse' | 'fallback-demo' | 'failed',
    message: 'Using demo playlist because public Suno metadata was not detected.',
    tracks: sampleTracks
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
    if (!response.ok) return { ...result, message: `Suno fetch returned HTTP ${response.status}; using demo fallback.` };
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
