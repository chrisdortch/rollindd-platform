export type Track = {
  id: string;
  title: string;
  hiddenArtistName?: string;
  coverImageUrl: string;
  videoUrl?: string;
  audioUrl?: string;
  mp3Url?: string;
  durationSeconds?: number;
  lyrics: string;
  sortOrder: number;
  downloadable?: boolean;
  sourceUrl?: string;
  mediaStatus?: 'complete' | 'partial' | 'missing_audio' | 'missing_lyrics';
};

export type ThemeConfig = {
  palette: {
    background: string;
    surface: string;
    accent: string;
    accent2: string;
    text: string;
    muted: string;
  };
  typography: {
    display: string;
    body: string;
  };
  hero: {
    imageUrl: string;
    layout: 'cinematic' | 'poster' | 'minimal';
    headline: string;
    subheadline: string;
  };
  grid: {
    columnsMobile: number;
    lazyLoad: boolean;
    showArtistNames: boolean;
  };
  player: {
    mode: 'fullscreen';
    lyricsOverlay: boolean;
    tabs: Array<'Art' | 'Lyrics' | 'Video'>;
  };
  search: {
    lyricsOnly: boolean;
    exactMatchAvailable: boolean;
    highlightMatches: boolean;
  };
};

export type Site = {
  id: string;
  slug: string;
  primaryDomain?: string;
  fallbackSubdomain?: string;
  title: string;
  tagline: string;
  sunoPlaylistUrl?: string;
  theme: ThemeConfig;
  tracks: Track[];
  status: 'draft' | 'preview' | 'live' | 'paused';
};

export type CentralCommandResult = {
  status: 'completed' | 'needs_user_action' | 'failed';
  parsed: Record<string, unknown>;
  completed: string[];
  nextSteps: string[];
  riskNotes: string[];
  site?: Site;
};
