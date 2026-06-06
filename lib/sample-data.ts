import type { Site, Track } from './types';

const playlistUrl = 'https://suno.com/playlist/782a2eb4-404b-47c3-b992-d5c2be81a5a0';

const productionWords: Record<string, string> = {
  '5ee44892-74e9-4df9-af0f-84423051331c': `Fearlessness is not the absence of fear; it is the courage to face it.

In our journey, we must confront the uncertainties that lie ahead.

Fear can paralyze us, but when we choose to act in spite of it, we unlock the potential to innovate, to create, and to connect.

Fearlessness empowers us to challenge the status quo, to rise above our limitations, and to inspire others to do the same.

It is the spark that ignites change and the foundation upon which love and wisdom can flourish.`,
  '2c87727a-2450-49c9-87d3-bcf6f02dc1a4': `Love is the greatest force we possess.

It transcends boundaries, dissolves conflict, and nurtures understanding.

In our quest for progress, we must cultivate love for ourselves, for others, and for the world around us.

It is through love that we build bridges, fostering a sense of belonging and community.`,
  'b4135e20-2b88-4e53-b816-b445d9b325bd': `Wisdom is the guiding star in the tumultuous seas of life.

It is knowledge tempered by experience, the insight that allows us to navigate complexities with grace.

In a rapidly changing world, wisdom becomes our anchor, reminding us to pause, reflect, and choose our paths with discernment.

We must seek wisdom not just for ourselves, but as a collective pursuit, sharing insights and learning from one another.`,
  '0f31587a-32de-4f11-bed5-ecc5e3bfe4ae': `In a society that often glorifies speed and immediacy, patience is a radical act.

It teaches us to embrace the journey, to appreciate the process of growth and transformation.

Patience allows us to listen deeply, to understand varying perspectives, and to cultivate resilience in the face of adversity.

It reminds us that meaningful change takes time, and that the seeds of today's efforts will bloom into tomorrow's realities.`,
  '6e8aa289-0747-4a2a-b420-6f9fd6408913': `Collaboration and competition are two sides of the same coin.

While competition drives excellence and innovation, collaboration fosters unity and shared purpose.

Healthy competition inspires growth, pushing us to transcend our limits; yet, it is in collaboration that we find strength.

Together, we can achieve what no individual can accomplish alone.`,
  '13767271-d78c-4a3b-8a00-63a9a775ef63': `To harness the full potential of fearlessness, love, wisdom, patience, collaboration, and competition, we must cultivate the wisdom to moderate.

This requires discernment in our choices and actions, ensuring that our drive for success does not overshadow our commitment to community.

It is the wisdom to recognize when to push forward and when to step back, when to lead and when to follow.`,
  '45b1cb4e-8e20-423c-8245-fd1d2c9d9f47': `As we embark on this journey together, let fearlessness be our compass, love our fuel, wisdom our guide, and patience our companion.

Let us embrace collaboration as a means of collective empowerment and competition as a catalyst for excellence.

Together, let us build a future grounded in these principles, a future where fearlessness, love, wisdom, and patience illuminate the path ahead.`
};

function sunoTrack(id: string, title: string, durationSeconds: number, imageHash: string, sortOrder: number): Track {
  return {
    id,
    title,
    coverImageUrl: `https://cdn2.suno.ai/${id}_${imageHash}.jpeg`,
    videoUrl: `https://cdn1.suno.ai/${id}.mp4`,
    audioUrl: `https://cdn1.suno.ai/${id}.mp3`,
    mp3Url: `https://cdn1.suno.ai/${id}.mp3`,
    durationSeconds,
    sortOrder,
    downloadable: true,
    sourceUrl: `https://suno.com/song/${id}`,
    mediaStatus: 'complete',
    lyrics: productionWords[id] || ''
  };
}

export const sampleTracks: Track[] = [
  sunoTrack('5ee44892-74e9-4df9-af0f-84423051331c', 'I. The Essence of Fearlessness', 98, '1169a304', 1),
  sunoTrack('2c87727a-2450-49c9-87d3-bcf6f02dc1a4', 'II. The Power of Love', 92, 'f5b30f16', 2),
  sunoTrack('b4135e20-2b88-4e53-b816-b445d9b325bd', 'III. The Pursuit of Wisdom', 90, 'a2ca07a6', 3),
  sunoTrack('0f31587a-32de-4f11-bed5-ecc5e3bfe4ae', 'IV. The Art of Patience', 81, '899c2037', 4),
  sunoTrack('6e8aa289-0747-4a2a-b420-6f9fd6408913', 'V. The Dance of Collaboration and Competition', 53, 'ac669f49', 5),
  sunoTrack('13767271-d78c-4a3b-8a00-63a9a775ef63', 'VI. The Wisdom to Moderate', 83, '598bc2b6', 6),
  sunoTrack('45b1cb4e-8e20-423c-8245-fd1d2c9d9f47', 'Conclusion: Illuminate the Path Ahead', 73, '77cf2714', 7)
];

export const sampleSite: Site = {
  id: 'sample-rollindd',
  slug: 'rollindd',
  primaryDomain: 'rollindd-platform.vercel.app',
  fallbackSubdomain: 'rollindd.rollindd.com',
  title: 'RollinDD',
  tagline: 'Fearlessness, love, wisdom, patience, collaboration, competition, and luminous resilience.',
  sunoPlaylistUrl: playlistUrl,
  status: 'preview',
  theme: {
    palette: {
      background: '#020712',
      surface: 'rgba(8,18,32,.76)',
      accent: '#d7a84f',
      accent2: '#ffd875',
      text: '#f7f1e3',
      muted: '#aeb7c6'
    },
    typography: { display: 'cinematic-serif', body: 'modern-sans' },
    hero: {
      imageUrl: 'https://cdn2.suno.ai/d1ccd86f.jpeg',
      layout: 'cinematic',
      headline: 'RollinDD',
      subheadline: 'Fearlessness, love, wisdom, patience, collaboration, competition, and luminous resilience.'
    },
    grid: { columnsMobile: 3, lazyLoad: true, showArtistNames: false },
    player: { mode: 'fullscreen', lyricsOverlay: true, tabs: ['Art', 'Lyrics', 'Video'] },
    search: { lyricsOnly: true, exactMatchAvailable: true, highlightMatches: true }
  },
  tracks: sampleTracks
};

export const sites: Site[] = [sampleSite];
