import type { Site, Track } from './types';

const art = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;

export const sampleTracks: Track[] = [
  {
    id: 'neon-rain',
    title: 'Neon Rain',
    coverImageUrl: art('photo-1519608487953-e999c86e7455'),
    durationSeconds: 226,
    sortOrder: 1,
    downloadable: false,
    mediaStatus: 'partial',
    lyrics: `City lights hum in the distance
Echoes bounce off the pavement
Neon dreams in the midnight
We're dancing in the neon rain
Washes over all our fears
Lost in colors, lost in you
We're chasing shadows through the rain
Hoping the morning won't feel the same`
  },
  {
    id: 'echoes-of-you',
    title: 'Echoes of You',
    coverImageUrl: art('photo-1500530855697-b586d89ba3ee'),
    durationSeconds: 211,
    sortOrder: 2,
    downloadable: false,
    mediaStatus: 'partial',
    lyrics: `I hear echoes of you in the static
A soft blue flame in the attic
Chasing shadows through the rain
Every whisper says your name
If the night becomes a mirror
Let the gold light pull us nearer`
  },
  {
    id: 'golden-hour',
    title: 'Golden Hour',
    coverImageUrl: art('photo-1507525428034-b723cf961d3e'),
    durationSeconds: 205,
    sortOrder: 3,
    downloadable: false,
    mediaStatus: 'partial',
    lyrics: `Meet me where the water burns gold
Every story turns young when it should grow old
Golden hour, hold me still
We are fire on the hill`
  },
  {
    id: 'deep-blue',
    title: 'Deep Blue',
    coverImageUrl: art('photo-1518837695005-2083093ee35b'),
    durationSeconds: 244,
    sortOrder: 4,
    downloadable: false,
    mediaStatus: 'partial',
    lyrics: `Still chasing shadows through the rain
Drifting away from yesterday
Deep blue carries the ache below
Where silent whales and old ghosts go`
  },
  {
    id: 'into-the-void',
    title: 'Into the Void',
    coverImageUrl: art('photo-1500534314209-a25ddb2bd429'),
    durationSeconds: 238,
    sortOrder: 5,
    downloadable: false,
    mediaStatus: 'partial',
    lyrics: `There is a door where the thunder sleeps
A black stone tower where the secret keeps
Into the void, I hear my name
Nothing returns but the shape of flame`
  },
  {
    id: 'midnight-drive',
    title: 'Midnight Drive',
    coverImageUrl: art('photo-1500530855697-b586d89ba3ee'),
    durationSeconds: 219,
    sortOrder: 6,
    downloadable: false,
    mediaStatus: 'partial',
    lyrics: `Midnight drive through a violet sky
Your hand in mine as the old worlds die
Headlights bloom like prayer and chrome
Every road keeps leading home`
  },
  {
    id: 'wild-and-free',
    title: 'Wild & Free',
    coverImageUrl: art('photo-1470770903676-69b98201ea1c'),
    durationSeconds: 202,
    sortOrder: 7,
    downloadable: false,
    mediaStatus: 'partial',
    lyrics: `Run where the wheat fields catch the sun
Wild and free, we become undone
No old chain can name the breeze
No locked gate can hold the trees`
  },
  {
    id: 'new-horizons',
    title: 'New Horizons',
    coverImageUrl: art('photo-1500534314209-a25ddb2bd429'),
    durationSeconds: 241,
    sortOrder: 8,
    downloadable: false,
    mediaStatus: 'partial',
    lyrics: `New horizons over waterfalls
Every broken kingdom calls
Build a bridge from spark to stone
Find the sky and call it home`
  },
  {
    id: 'fading-lights',
    title: 'Fading Lights',
    coverImageUrl: art('photo-1500530855697-b586d89ba3ee'),
    durationSeconds: 232,
    sortOrder: 9,
    downloadable: false,
    mediaStatus: 'partial',
    lyrics: `I keep chasing shadows through the rain
Till the city lets me disappear
Fading lights on a windowpane
Love is far but the signal's clear`
  }
];

export const sampleSite: Site = {
  id: 'sample-neon-rain',
  slug: 'neon-rain',
  fallbackSubdomain: 'neon-rain.rollindd.com',
  title: 'Neon Rain',
  tagline: 'Songs for the storm before sunrise.',
  sunoPlaylistUrl: 'https://suno.com/playlist/example',
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
      imageUrl: art('photo-1500530855697-b586d89ba3ee'),
      layout: 'cinematic',
      headline: 'Music That Moves Worlds.',
      subheadline: 'Discover. Listen. Feel.'
    },
    grid: { columnsMobile: 3, lazyLoad: true, showArtistNames: false },
    player: { mode: 'fullscreen', lyricsOverlay: true, tabs: ['Art', 'Lyrics', 'Video'] },
    search: { lyricsOnly: true, exactMatchAvailable: true, highlightMatches: true }
  },
  tracks: sampleTracks
};

export const sites: Site[] = [sampleSite];
