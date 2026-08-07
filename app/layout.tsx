import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Fraunces } from 'next/font/google';
import '../app/globals.css';

const displayFont = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

const bodyFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { template: '%s | Folio', default: 'Folio' },
  description: 'A private, considered space for your notes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable} font-body`}>{children}</body>
    </html>
  );
}
