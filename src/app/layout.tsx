import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import '@/styles/globals.css';
import { ThemeInit } from '@/components/shell/ThemeInit';

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const body = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://money-maker-tawny.vercel.app'),
  title: 'MoneyMaker',
  description: 'Tu quincena, clara. Bancos, tarjetas, suscripciones y presupuesto en un solo lugar.',
  // Vista previa al compartir el enlace (WhatsApp, iMessage, X). La imagen la genera app/opengraph-image.tsx.
  openGraph: { type: 'website', locale: 'es_MX', siteName: 'MoneyMaker', title: 'MoneyMaker · Sabe cuánto te queda esta quincena', description: 'Bancos, tarjetas, suscripciones y presupuesto por quincena en un solo lugar. Sin darnos tus claves.' },
  twitter: { card: 'summary_large_image', title: 'MoneyMaker · Sabe cuánto te queda esta quincena', description: 'Bancos, tarjetas, suscripciones y presupuesto por quincena en un solo lugar.' },
  applicationName: 'MoneyMaker',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'MoneyMaker' },
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/icon-192.png', sizes: '192x192' }], apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  themeColor: '#16A34A',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Aplica el tema guardado antes del primer render para evitar el parpadeo.
const themeScript = `(function(){try{var t=localStorage.getItem('mm-theme');if(t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.setAttribute('data-theme','dark')}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeInit />
        {children}
      </body>
    </html>
  );
}
