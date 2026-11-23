// App web do Vice Route (spec 004): SPA estática na Vercel. O catálogo vem de /catalog (gerado por
// pnpm catalog:build) e os tiles de /tiles; o motor roda num Web Worker. Nada vai para servidores de
// terceiros: sem fontes, scripts ou mapas externos.
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: false,
  devtools: { enabled: false },
  css: ['leaflet/dist/leaflet.css', '~/assets/css/main.css'],
  typescript: { strict: true },
  vite: { worker: { format: 'es' } },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR', 'data-theme': 'dark' },
      title: 'Vice Route',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        {
          name: 'description',
          content:
            'Acompanhamento de 100% para GTA VI: mapa, missões, perdíveis e próximos passos.',
        },
        { name: 'theme-color', content: '#0f1626' },
      ],
    },
  },
})
