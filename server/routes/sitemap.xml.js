import { MOCK_STOCKS } from '../utils/mock-stocks'

// TWSE_WEIGHTED / TPEX_WEIGHTED 來自 shared/utils/index-constituents.js，
// app 與 server 皆自動匯入，不需 import。
function stockSitemapEntries() {
  const seen = new Set()
  const entries = []
  const add = (symbol) => {
    if (seen.has(symbol)) return
    seen.add(symbol)
    entries.push({ path: `/stock/${symbol}`, changefreq: 'daily', priority: '0.7' })
  }
  for (const s of MOCK_STOCKS) add(s.symbol)
  // 大型權值股清單：已是真實存在、可被索引的個股頁，之前漏掉了
  for (const s of TWSE_WEIGHTED) add(s.symbol)
  for (const s of TPEX_WEIGHTED) add(s.symbol)
  return entries
}

function xmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export default defineEventHandler((event) => {
  const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/$/, '')
  const today = new Date().toISOString().slice(0, 10)

  const entries = [
    { path: '/', changefreq: 'daily', priority: '1.0' },
    { path: '/market/TAIEX', changefreq: 'daily', priority: '0.8' },
    { path: '/market/TPEX', changefreq: 'daily', priority: '0.8' },
    { path: '/market/weighted/TWSE', changefreq: 'daily', priority: '0.6' },
    { path: '/market/weighted/TPEX', changefreq: 'daily', priority: '0.6' },
    { path: '/stock', changefreq: 'weekly', priority: '0.6' },
    { path: '/screener', changefreq: 'daily', priority: '0.8' },
    { path: '/signals', changefreq: 'hourly', priority: '0.8' },
    // 個股頁：mock 股票 + 大型權值股清單（上市/上櫃合計 83 檔），去重
    ...stockSitemapEntries()
  ]

  const urls = entries
    .map(
      ({ path, changefreq, priority }) =>
        `  <url>\n    <loc>${xmlEscape(`${siteUrl}${path}`)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    )
    .join('\n')

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
})
