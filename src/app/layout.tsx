import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BharatHR — Admin portal',
  description: 'Bharat Herbs HR platform administration',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
