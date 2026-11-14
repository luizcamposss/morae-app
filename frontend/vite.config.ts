import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiOrigin = getOrigin(env.VITE_API_URL)

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: ['apple-touch-icon-180x180.png'],
        manifest: {
          name: 'Moraê',
          short_name: 'Moraê',
          description: 'Gestão de condomínios: cobranças, avisos, ocorrências e assembleias em um só lugar.',
          lang: 'pt-BR',
          start_url: '/login',
          scope: '/',
          display: 'standalone',
          theme_color: '#edf0ea',
          background_color: '#edf0ea',
          categories: ['business', 'productivity'],
          icons: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
            { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // App shell only: API data is never cached.
          globPatterns: ['**/*.{html,js,css,svg,woff2}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          // Matchers are serialized into sw.js, so they cannot read variables from this file.
          runtimeCaching: [
            { urlPattern: ({ url }) => url.pathname.startsWith('/api/'), handler: 'NetworkOnly' },
            ...(apiOrigin ? [{ urlPattern: new RegExp(`^${escapeRegExp(apiOrigin)}/`), handler: 'NetworkOnly' as const }] : []),
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
  }
})

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getOrigin(url: string | undefined) {
  try {
    return url ? new URL(url).origin : null
  } catch {
    return null
  }
}
