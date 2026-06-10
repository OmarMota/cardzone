import type { Metadata } from 'next';
import { Syne, DM_Sans, JetBrains_Mono, Public_Sans, Geist_Mono } from 'next/font/google';
import './globals.css';
import { cn } from "@/lib/utils";

const geistMonoHeading = Geist_Mono({subsets:['latin'],variable:'--font-heading'});

const publicSans = Public_Sans({subsets:['latin'],variable:'--font-sans'});

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CARDZONE — TCG Calendar',
  description:
    'Unified TCG release & event calendar for CARDZONE — Italian TCG & collectibles store.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      className={cn("h-full dark", syne.variable, dmSans.variable, jetbrainsMono.variable, "font-sans", publicSans.variable, geistMonoHeading.variable)}
    >
      <body className="h-full overflow-hidden">
        {children}
      </body>
    </html>
  );
}
