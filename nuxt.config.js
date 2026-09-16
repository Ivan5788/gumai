export default defineNuxtConfig({
  compatibilityDate: '2026-09-03',
  devtools: { enabled: false },
  ssr: true,
  css: ['~/assets/styles/main.scss'],
  modules: ['@pinia/nuxt', 'nuxt-auth-utils'],
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
      siteName: '股脈',
      siteDescription:
        '股脈 是台股與美股即時看盤、技術分析與選股平台，提供即時報價、K 線圖、均線、三大法人與選股工具。',
      // 瀏覽器端呼叫後端用；預設走 Nuxt 同源路徑 /api（未來由 Nitro 代理到後端，避免 CORS 並隱藏內網位址）
      apiBase: process.env.NUXT_PUBLIC_API_BASE || '/api',
      // 大戶買賣力目前是純示範資料（需要付費逐筆成交/內外盤資料才有真實版本，見資料源檢視），
      // 先隱藏整個功能面（個股頁區塊、選股條件、訊號類型），接上真實資料源後把這個 env 設 true 即可開放，
      // 不用改任何程式碼。預設關閉（跟其他 *_ENABLED 預設開啟相反，是刻意的）。
      bigPowerEnabled: process.env.NUXT_PUBLIC_BIGPOWER_ENABLED === 'true'
    }
  },
  routeRules: {
    // 基本安全標頭（見資安檢視）。CSP 先不加——本站沒有外部 <script src>，
    // 但 Nuxt hydration payload 需要 inline script，要另外設計 nonce/hash 才能安全收緊，
    // 之後有時間再處理，先不要貿然加可能弄壞 hydration 的規則。
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
      }
    },
    '/': { prerender: true },
    '/stock': { prerender: true },
    // 選股 / 訊號的結果會隨盤後指標快照變動，不預渲染；SSR + 短快取
    '/screener': { swr: 120 },
    '/signals': { swr: 120 },
    // 個股頁不預渲染全部，改為 SWR：首次請求時 SSR，之後 5 分鐘內回快取
    '/stock/**': { swr: 300 },
    // 大盤指數頁：官方盤後資料，SSR + 短快取
    '/market/**': { swr: 300 }
  },
  nitro: {
    // 靜態資產（JS/CSS/預渲染 HTML）build 時預先壓縮成 .gz/.br，
    // 讓支援的瀏覽器直接拿壓縮版，省下大半傳輸量（效能檢視）
    compressPublicAssets: { gzip: true, brotli: true },
    prerender: {
      // 不爬連結（避免把清單頁連到的個股頁全部預渲染）；
      // 只預渲染靜態頁與少數熱門個股，其餘走 SWR
      crawlLinks: false,
      routes: [
        '/',
        '/market/TAIEX',
        '/market/TPEX',
        '/stock',
        '/sitemap.xml',
        '/robots.txt',
        '/stock/2330',
        '/stock/2317',
        '/stock/2454',
        '/stock/AAPL',
        '/stock/NVDA',
        '/stock/TSLA'
      ]
    },
    // 使用者資料（收藏、畫線）先存本機檔案，未來由 Spring Boot 取代
    storage: {
      data: { driver: 'fs', base: './.data/kv' }
    },
    devStorage: {
      data: { driver: 'fs', base: './.data/kv' }
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
