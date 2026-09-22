import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const sans = Space_Grotesk({ variable: '--font-sans', subsets: ['latin'] });
const mono = IBM_Plex_Mono({ variable: '--font-mono', subsets: ['latin'], weight: ['400', '500', '600'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://gtpoker.org'),
  title: 'AlgoPoker @ GT — Autonomous six-max poker tournament',
  description: 'Build an autonomous Python poker bot, test it against five opponent strategies, and compete at a six-max no-limit Hold’em table.',
  openGraph: {
    title: 'AlgoPoker @ GT',
    description: 'Build an autonomous Python poker bot and compete in a six-max no-limit Hold’em tournament.',
    url: 'https://gtpoker.org',
    siteName: 'AlgoPoker @ GT',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'AlgoPoker @ GT' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AlgoPoker @ GT',
    description: 'Build an autonomous Python poker bot and compete in a six-max no-limit Hold’em tournament.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable}`}>{children}</body>
    </html>
  );
}
