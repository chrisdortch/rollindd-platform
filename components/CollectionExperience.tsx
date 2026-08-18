'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { RollinSite } from '@/components/RollinSite';
import type { Site } from '@/lib/types';

async function copyCollectionUrl(url: string) {
  if (!navigator.clipboard?.writeText) return false;

  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export function CollectionExperience({ site }: { site: Site }) {
  const [shareStatus, setShareStatus] = useState('');
  const themeStyle = {
    '--bg': site.theme.palette.background,
    '--surface': site.theme.palette.surface,
    '--text': site.theme.palette.text,
    '--muted': site.theme.palette.muted,
    '--accent': site.theme.palette.accent,
    '--accent-2': site.theme.palette.accent2
  } as CSSProperties;
  const heroStyle = {
    backgroundColor: site.theme.palette.background,
    backgroundImage: `linear-gradient(90deg, rgba(2, 7, 18, .94) 0%, rgba(2, 7, 18, .72) 48%, rgba(2, 7, 18, .28) 100%), url(${JSON.stringify(site.theme.hero.imageUrl)})`,
    backgroundPosition: 'center',
    backgroundSize: 'cover'
  } as CSSProperties;

  async function shareCollection() {
    const cleanUrl = new URL(window.location.pathname, window.location.origin).toString();
    const shareData: ShareData = {
      title: site.title,
      text: site.tagline,
      url: cleanUrl
    };

    setShareStatus('');

    if (navigator.share) {
      try {
        setShareStatus('Opening share options…');
        await navigator.share(shareData);
        setShareStatus('Share complete');
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          setShareStatus('');
          return;
        }
      }
    }

    const copied = await copyCollectionUrl(cleanUrl);
    setShareStatus(
      copied
        ? 'Collection link copied'
        : 'Use your browser menu to share this collection'
    );
  }

  return (
    <>
      <section
        className="shell"
        style={themeStyle}
        aria-label={`${site.title} collection introduction`}
      >
        <div className="hero" style={heroStyle}>
          <div className="hero-content">
            <div className="kicker">
              Curated collection · {site.tracks.length} productions
            </div>
            <h1>{site.theme.hero.headline || site.title}</h1>
            <p className="lede">{site.theme.hero.subheadline || site.tagline}</p>
            <div className="release-row">
              <a className="gold-button" href="#tracks">
                Enter the collection
              </a>
              <button
                className="ghost-button"
                type="button"
                onClick={shareCollection}
              >
                Share collection
              </button>
              {site.sunoPlaylistUrl && (
                <a
                  className="ghost-button"
                  href={site.sunoPlaylistUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Suno
                </a>
              )}
            </div>
            {shareStatus && (
              <p className="helper" role="status" aria-live="polite">
                {shareStatus}
              </p>
            )}
          </div>
        </div>
      </section>
      <RollinSite site={site} />
    </>
  );
}
