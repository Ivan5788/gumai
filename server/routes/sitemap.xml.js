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
  const paths = ['/', '/stock', '/screener', '/signals']

  const urls = paths
    .map((path) => {
      const loc = xmlEscape(`${siteUrl}${path}`)
      return `  <url>\n    <loc>${loc}</loc>\n    <changefreq>daily</changefreq>\n  </url>`
    })
    .join('\n')

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
})
