import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa';
import path from 'path';
import {readFileSync} from 'node:fs';
import {defineConfig, loadEnv} from 'vite';

const pkg = JSON.parse(readFileSync(path.resolve('./package.json'), 'utf-8')) as {version: string};

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['pwa-icon.svg'],
        manifest: {
          name: 'StreamNexus',
          short_name: 'StreamNexus',
          description: 'TV en vivo, streaming y contenidos',
          theme_color: '#0A0B0D',
          background_color: '#0A0B0D',
          display: 'standalone',
          orientation: 'any',
          start_url: './index.html',
          scope: './',
          icons: [
            {
              src: 'pwa-icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,ico,png,woff2}'],
          navigateFallback: 'index.html',
        },
        devOptions: {enabled: false},
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      fs: {
        allow: [path.resolve(__dirname, '..')],
      },
    },
  };
});
