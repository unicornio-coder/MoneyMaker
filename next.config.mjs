/** @type {import('next').NextConfig} */
import { createRequire } from 'node:module';
const { version } = createRequire(import.meta.url)('./package.json');

const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_APP_VERSION: version },
  // Los logos locales cambian poco (el bot los repone con el mismo nombre): un día en caché y una semana sirviendo el viejo mientras revalida.
  async headers() {
    return [{ source: '/logos/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] }];
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'www.google.com', pathname: '/s2/favicons' }],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist'],
    // pdf.js carga su worker, cmaps y fuentes por ruta en tiempo de ejecución: hay que empaquetarlos con la función.
    outputFileTracingIncludes: {
      '/api/imports': ['./node_modules/pdfjs-dist/legacy/build/**', './node_modules/pdfjs-dist/cmaps/**', './node_modules/pdfjs-dist/standard_fonts/**'],
    },
  },
};

export default nextConfig;
