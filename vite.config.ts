import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    allowedHosts: ['sb-1wc5sytu7g6i.vercel.run'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['orbitvitals-icon.svg'],
      manifest: {
        id: '/',
        name: 'OrbitVitals — Mission Health',
        short_name: 'OrbitVitals',
        description: 'An offline-first educational mission health tracker.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#08111d',
        theme_color: '#08111d',
        icons: [{ src: '/orbitvitals-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: '/index.html',
        runtimeCaching: [],
      },
      devOptions: { enabled: false, type: 'module' },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
