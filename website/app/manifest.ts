import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Snap Recipes',
    short_name: 'SnapRecipes',
    description: 'Save recipes from any website instantly',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#FDFBF7',
    theme_color: '#FDFBF7',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
