import { MOCK_STOCKS } from '../utils/mock-stocks'

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
    // 個股頁：目前為 mock 股票池，未來由後端提供上市櫃 / 美股清單
    ...MOCK_STOCKS.map((s) => ({
      path: `/stock/${s.symbol}`,
      changefreq: 'daily',
      priority: '0.7'
    }))
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
