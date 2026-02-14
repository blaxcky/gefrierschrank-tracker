import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const isCloudflareBuild = mode === 'cloudflare' || process.env.CF_PAGES === '1'
  const deployTarget = isCloudflareBuild ? 'cloudflare' : 'github'
  const base = deployTarget === 'cloudflare' ? '/' : '/gefrierschrank-tracker/'

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'apple-touch-icon-180x180.png',
        ],
        manifest: {
          name: 'Gefrierschrank Tracker',
          short_name: 'Freezer',
          description: 'Gefrierschrank Inventar verwalten',
          theme_color: '#007AFF',
          background_color: '#F2F2F7',
          display: 'standalone',
          orientation: 'portrait',
          scope: base,
          start_url: base,
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        },
      }),
    ],
  }
})
