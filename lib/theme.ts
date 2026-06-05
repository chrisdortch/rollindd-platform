import type { ThemeConfig, Track } from './types';

const motifPalettes: Record<string, ThemeConfig['palette']> = {
  rain: { background: '#020712', surface: 'rgba(7,18,34,.82)', accent: '#d7a84f', accent2: '#ffd875', text: '#f7f1e3', muted: '#aeb7c6' },
  fire: { background: '#100603', surface: 'rgba(35,12,8,.82)', accent: '#e08839', accent2: '#ffd37a', text: '#fff2de', muted: '#c5a996' },
  lake: { background: '#031018', surface: 'rgba(6,27,40,.82)', accent: '#d7a84f', accent2: '#8ee7ff', text: '#edfaff', muted: '#9fb7c4' },
  forest: { background: '#03110b', surface: 'rgba(5,29,18,.82)', accent: '#d7a84f', accent2: '#9af0a6', text: '#f3f9ed', muted: '#a7b9a7' },
  neon: { background: '#030616', surface: 'rgba(9,13,39,.82)', accent: '#d7a84f', accent2: '#ff5bd6', text: '#f7f1ff', muted: '#b7afd0' }
};

export function analyzeLyrics(tracks: Track[], userPrompt = '') {
  const corpus = `${userPrompt}
${tracks.map((t) => t.lyrics).join('
')}`.toLowerCase();
  const motifs = ['rain','fire','lake','forest','neon','gold','shadow','light','city','water','storm','home']
    .map((word) => ({ word, count: (corpus.match(new RegExp(`\b${word}\b`, 'g')) || []).length }))
    .sort((a, b) => b.count - a.count);
  const top = motifs.filter((m) => m.count > 0).slice(0, 6).map((m) => m.word);
  const dominant = top.includes('neon') ? 'neon' : top.includes('rain') ? 'rain' : top.includes('fire') ? 'fire' : top.includes('forest') ? 'forest' : top.includes('lake') || top.includes('water') ? 'lake' : 'rain';
  return {
    dominantMood: dominant === 'neon' ? 'cinematic neon intensity' : dominant === 'fire' ? 'mythic warmth and transformation' : dominant === 'forest' ? 'earthy wonder and hidden paths' : dominant === 'lake' ? 'resort-lake serenity and horizon light' : 'rain-soaked resilience',
    visualMotifs: top.length ? top : ['light', 'shadow', 'journey'],
    emotionalArc: corpus.includes('home') ? 'longing to homecoming' : corpus.includes('storm') ? 'storm to clarity' : 'isolation to renewal',
    recommendedPaletteKey: dominant
  };
}

export function generateThemeFromLyrics(tracks: Track[], userPrompt = '', heroImageUrl?: string): ThemeConfig {
  const analysis = analyzeLyrics(tracks, userPrompt);
  const palette = motifPalettes[analysis.recommendedPaletteKey] || motifPalettes.rain;
  return {
    palette,
    typography: { display: 'cinematic-serif', body: 'modern-sans' },
    hero: {
      imageUrl: heroImageUrl || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
      layout: 'cinematic',
      headline: analysis.recommendedPaletteKey === 'lake' ? 'Music Across the Water.' : analysis.recommendedPaletteKey === 'fire' ? 'Songs Built From Fire.' : analysis.recommendedPaletteKey === 'forest' ? 'Where the Songs Become Wild.' : 'Music That Moves Worlds.',
      subheadline: `${analysis.dominantMood}. ${analysis.emotionalArc}.`
    },
    grid: { columnsMobile: 3, lazyLoad: true, showArtistNames: false },
    player: { mode: 'fullscreen', lyricsOverlay: true, tabs: ['Art', 'Lyrics', 'Video'] },
    search: { lyricsOnly: true, exactMatchAvailable: true, highlightMatches: true }
  };
}
