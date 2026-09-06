export default defineEventHandler((event) => {
  const siteUrl = String(useRuntimeConfig().public.siteUrl).replace(/\/$/, '')

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')

  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    ''
  ].join('\n')
})
