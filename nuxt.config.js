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
    // 僅伺服器端可讀（SSR / prerender 時呼叫後端用），不會送到瀏覽器。
    // 未來整合 Spring Boot 後改成內網位址，例如 http://stockpulse-api:8080/api
    apiBase: process.env.NUXT_API_BASE || 'http://localhost:8080/api',
    public: {
      // 網站對外網址，用於 canonical、sitemap、OG url，正式環境務必設定
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      siteName: 'StockPulse',
      siteDescription:
        'StockPulse 是台股與美股即時看盤、技術分析與選股平台，提供即時報價、K 線圖、均線、三大法人與選股工具。',
      // 瀏覽器端呼叫後端用；預設走 Nuxt 同源路徑 /api（未來由 Nitro 代理到後端，避免 CORS 並隱藏內網位址）
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api'
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
