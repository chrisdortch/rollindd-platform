'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { RollinSite } from '@/components/RollinSite';
import type { Site } from '@/lib/types';
import styles from './CollectionExperience.module.css';

async function copyCollectionUrl(url: string) {
  if (!navigator.clipboard?.writeText) return false;

  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

function replaceCollectionLocation(hash: string) {
  const nextUrl = new URL(window.location.href);
  nextUrl.hash = hash;
  window.history.replaceState(
    null,
    '',
    `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`
  );
}

export function CollectionExperience({ site }: { site: Site }) {
  const [entered, setEntered] = useState(false);
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

  useEffect(() => {
    const syncWithHash = () => setEntered(window.location.hash === '#tracks');
    syncWithHash();
    window.addEventListener('hashchange', syncWithHash);
    return () => window.removeEventListener('hashchange', syncWithHash);
  }, []);

  function enterCollection() {
    setEntered(true);
    replaceCollectionLocation('tracks');
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function showCollectionIntro() {
    setEntered(false);
    replaceCollectionLocation('');
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

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

  if (entered) {
    return (
      <div className={styles.libraryView} style={themeStyle}>
        <div className={styles.introBar}>
          <button
            className={styles.introButton}
            type="button"
            onClick={showCollectionIntro}
          >
            <span aria-hidden="true">←</span>
            Collection intro
          </button>
          <span className={styles.introTitle}>
            {site.theme.hero.headline || site.title}
          </span>
        </div>
        <RollinSite site={site} />
      </div>
    );
  }

  return (
    <section
      className={`shell ${styles.introShell}`}
      style={themeStyle}
      aria-label={`${site.title} collection introduction`}
    >
      <div className={`hero ${styles.introHero}`} style={heroStyle}>
        <div className={`hero-content ${styles.introContent}`}>
          <div className="kicker">
            Curated collection · {site.tracks.length} productions
          </div>
          <h1>{site.theme.hero.headline || site.title}</h1>
          <p className="lede">{site.theme.hero.subheadline || site.tagline}</p>
          <div className={`release-row ${styles.actions}`}>
            <button
              className={`gold-button ${styles.primaryAction}`}
              type="button"
              onClick={enterCollection}
            >
              Enter the collection
            </button>
            <button
              className={`ghost-button ${styles.secondaryAction}`}
              type="button"
              onClick={shareCollection}
            >
              Share collection
            </button>
            {site.sunoPlaylistUrl && (
              <a
                className={`ghost-button ${styles.secondaryAction}`}
                href={site.sunoPlaylistUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open in Suno
              </a>
            )}
          </div>
          {shareStatus && (
            <p className={`helper ${styles.shareStatus}`} role="status" aria-live="polite">
              {shareStatus}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
