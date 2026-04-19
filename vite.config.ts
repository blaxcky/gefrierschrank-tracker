import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

function normalizeBase(input: string): string {
  const trimmed = (input || './').trim()
  if (!trimmed || trimmed === '.') return './'
  if (trimmed === './' || trimmed === '.\\') return './'

  // Guard against shell path rewriting (e.g. Git Bash on Windows) or URLs.
  if (trimmed.includes('\\') || trimmed.includes('://') || /^[A-Za-z]:/.test(trimmed)) {
    return './'
  }

  if (trimmed.startsWith('./')) {
    return './'
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = normalizeBase(env.VITE_BASE || './')

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
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
