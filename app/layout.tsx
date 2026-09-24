import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'DoTask Panel',
  description: 'Admin panel for the DoTask remote tasking server.',
  icons: {
    icon: '/icon.svg',
  },
};

/**
 * Apply the stored color theme before first paint (avoids a flash of the
 * default theme). Must run before the panel markup is parsed.
 */
const themeInitScript = `(function(){try{var t=localStorage.getItem('dotask-theme');if(t){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
