import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'fs';

const rootPkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(rootPkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'PWA Soundboard',
        short_name: 'Soundboard',
        description: 'A simple PWA soundboard',
        theme_color: '#0f0f11',
        background_color: '#0f0f11',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-any-1024.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-any-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/maskable/maskable-icon-1024.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable/maskable-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable/maskable-icon-384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable/maskable-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable/maskable-icon-128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable/maskable-icon-96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable/maskable-icon-72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable/maskable-icon-48.png',
            sizes: '48x48',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,png,wav,mp3,ogg,opus,m4a,json}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/audio': 'http://127.0.0.1:3000',
      '/icons': 'http://127.0.0.1:3000',
    },
  },
  build: {
    outDir: 'dist',
  },
});
