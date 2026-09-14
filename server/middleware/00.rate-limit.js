// 全站 API 節流（見資安檢視：防大量/自動化請求灌爆本站與上游免費資料源）。
// 規則本體在 server/utils/rate-limit.js。
import { checkRateLimit } from '../utils/rate-limit'

export default defineEventHandler((event) => {
  const path = event.path || event.node.req.url || ''
  if (!path.startsWith('/api/')) return

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const hit = checkRateLimit(ip, path)
  if (hit) {
    setResponseHeader(event, 'Retry-After', String(hit.retryAfterSeconds))
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: '請求過於頻繁，請稍後再試。'
    })
  }
})
