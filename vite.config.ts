/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { devApi } from './vite-dev-api';

// https://vite.dev/config/
export default defineConfig({
  build: {
    // lightningcss (défaut) bute sur une règle CSS transitive de pdf.js ;
    // la minification CSS est désactivée (CSS de l'app très petit).
    cssMinify: false,
  },
  plugins: [
    devApi(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-icon.svg'],
      manifest: {
        name: 'Tramea — Trames de culte',
        short_name: 'Tramea',
        description:
          "Créer le programme d'un culte et l'exporter en PDF et en fichier ProPresenter, même hors-ligne.",
        lang: 'fr',
        theme_color: '#2F557F',
        background_color: '#F6F8FA',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/pwa-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // SPA : retombe sur index.html pour les routes (offline + deep links).
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        runtimeCaching: [
          {
            // Polices Google : disponibles hors-ligne après la première visite.
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: { provider: 'v8', reporter: ['text', 'html'] },
  },
});
