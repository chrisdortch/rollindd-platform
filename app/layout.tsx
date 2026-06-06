import type { Metadata } from 'next';
import './globals.css';

const title = 'RollinDD | Playlist Premiere Platform';
const description = 'Play RollinDD productions, read the words, and download individual MP3s or the full playlist.';

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
        alt: 'RollinDD Playlist Premiere'
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
