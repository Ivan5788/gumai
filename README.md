# 股脈 GuMai

台股與美股即時看盤、技術分析與選股平台。針對繁體中文（台灣）使用者，採用台灣證券市場慣用術語。

## 技術架構

| 項目 | 選型 |
| --- | --- |
| 框架 | Nuxt 4（Vue 3） |
| 語言 | JavaScript（不使用 TypeScript） |
| 狀態管理 | Pinia（`@pinia/nuxt`） |
| 樣式 | SCSS（`app/assets/styles`，abstracts 自動注入至 `.vue`） |
| 算繪 | SSR + SSG / Prerender（SEO 為核心需求） |
| 伺服器 | Nitro（`server/`），未來整合 Spring Boot 後端 |

### 為什麼用 SSR

SEO 是本專案重點需求。使用者透過瀏覽器 `Ctrl + U`（檢視原始碼）必須看得到伺服器初次回傳的 SEO 內容（標題、描述、結構化資料、主要文字），而非空的 root 元素。

- **SSG / Prerender**：首頁、選股說明頁、個股入口頁、`sitemap.xml`、`robots.txt`
- **SSR + 快取（SWR 300s）**：動態個股頁 `/stock/:symbol`（需動態 meta 與可被索引的基本內容）
- **瀏覽器端載入（hydration 後）**：即時報價、當日走勢、盤中法人買賣超、K 線互動與畫線、使用者收藏、選股與訊號搜尋結果

## 環境需求

- Node.js **>= 22.19.0**（Nuxt 4.5 要求；目前開發機為 22.14，建議升級）
- npm

## 開始使用

```bash
# 安裝依賴（因 npm 11 的 peer-set bug，需加旗標）
npm install --legacy-peer-deps

# 複製環境變數範本
cp .env.example .env

# 開發
npm run dev            # http://localhost:3000

# 建置與預覽
npm run build
npm run preview

# 靜態產生（prerender）
npm run generate
```

## 環境變數

見 [`.env.example`](.env.example)。

| 變數 | 用途 |
| --- | --- |
| `NUXT_PUBLIC_SITE_URL` | 網站對外網址（canonical、sitemap、OG url）。正式環境務必設定。 |
| `NUXT_API_BASE` | 伺服器端（SSR / prerender）呼叫後端的位址。 |
| `NUXT_PUBLIC_API_BASE` | 瀏覽器端呼叫位址，預設 `/api`（未來由 Nitro 同源代理到後端）。 |

## 專案結構

```
app/
  app.vue                  根組件
  error.vue                錯誤頁（404 / 500）
  layouts/default.vue      版面骨架（Header + 置中內容）
  components/AppHeader.vue  導覽列
  composables/usePageSeo.js SEO：meta、OG、canonical、JSON-LD
  pages/
    index.vue              首頁
    screener.vue           選股系統
    stock/index.vue        個股分析入口
    stock/[symbol].vue     動態個股頁（/stock/2330、/stock/NVDA）
  stores/                  Pinia stores（待建）
  assets/styles/           SCSS 設計系統（變數、mixins、reset、typography）
server/
  routes/sitemap.xml.js    動態 sitemap
  routes/robots.txt.js     動態 robots.txt
nuxt.config.js             Nuxt 設定（ssr、routeRules、prerender、runtimeConfig）
```

## 未來與 Spring Boot 整合

- SSR / prerender：Nitro 伺服器端以 `$fetch` 直接呼叫 `NUXT_API_BASE`
- 瀏覽器端：呼叫 `/api/**`，由 Nitro `routeRules` 代理到後端（隱藏內網位址、統一處理 CORS 與快取）
- 即時資料：瀏覽器直接對後端（或 API Gateway）開 WebSocket / SSE，不經 Nuxt
- Google 登入、使用者收藏、K 線畫線紀錄：OAuth 與資料持久化由 Spring Boot 負責

## 開發路線圖

1. ✅ 可運行基線（安裝、驗證 SSR、清理殘留、git 基準點）
2. ✅ 專案基礎設定強化（runtimeConfig、`.env.example`、README、換行規範）
3. 資料層抽象（API client、市場常數、Pinia store 骨架，先用 mock）
4. 個股頁 SSR 骨架補完（mock 基本資料、動態 title、404、BreadcrumbList、即時報價佔位）
5. K 線圖表（圖表庫選型、日 K / 週 K / 當日走勢、MA 疊加）
6. 即時看盤（polling / WebSocket 抽象）
7. 三大法人 + 大戶 / 散戶持股比例
8. 選股系統（規則引擎、條件 UI、結果列表）
9. 關鍵訊號搜尋
10. 使用者系統（Google 登入、收藏 CRUD、自訂分類命名、K 線畫線儲存）
11. SEO 收尾（動態 sitemap、結構化資料完善、prerender 名單、效能）
12. Spring Boot 整合切換（routeRules 代理、部署）
