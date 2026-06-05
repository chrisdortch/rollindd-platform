import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RollinDD | Playlist Premiere Platform',
  description: 'AI-assisted Suno playlist websites with cinematic players, lyric search, and custom themes.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
