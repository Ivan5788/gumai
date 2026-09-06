export default defineNuxtConfig({
  compatibilityDate: '2026-09-03',
  devtools: { enabled: false },
  ssr: true,
  css: ['~/assets/styles/main.scss'],
  modules: ['@pinia/nuxt'],
  typescript: {
    typeCheck: false
  },
  app: {
    head: {
      htmlAttrs: {
        lang: 'zh-Hant'
      },
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    }
  },
  routeRules: {
    '/': { prerender: true },
    '/screener': { prerender: true },
    '/stock': { prerender: true },
    '/stock/**': { swr: 300 }
  },
  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/stock', '/screener', '/sitemap.xml', '/robots.txt']
    }
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData(source, filename) {
            const normalized = String(filename).replace(/\\/g, '/')

            if (!normalized.includes('.vue')) {
              return source
            }

            return `@use "@/assets/styles/abstracts" as *;\n${source}`
          }
        }
      }
    }
  }
})
