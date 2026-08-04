import type { Metadata } from 'next';
import './globals.css';
import './brand-logo.css';

const title = 'RollinDD | Seven Reflections for the Road Ahead';
const description = 'A mobile-first seven-part listening series on fearlessness, love, wisdom, patience, collaboration, and moderation—with playback, readable words, search, and MP3 downloads.';

export const metadata: Metadata = {
  metadataBase: new URL('https://rollindd-platform.vercel.app'),
  title,
  description,
  applicationName: 'RollinDD',
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title,
    description,
    url: '/',
    siteName: 'RollinDD',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'RollinDD — Reflect deeply. Choose bravely.'
      }
    ],
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/opengraph-image']
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
