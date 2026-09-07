import { findMockStock } from '../../../utils/mock-stocks'
import { buildMockHolders } from '../../../utils/mock-institutional'

// GET /api/stocks/:symbol/holders?interval=1d|1wk
// 大戶（≥1,000 張）／散戶（≤100 張）每日持股量與買賣超。台股專屬。
export default defineEventHandler((event) => {
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()
  const { interval } = getQuery(event)

  const stock = findMockStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, statusMessage: `找不到股票代號 ${symbol}` })
  }

  return buildMockHolders(stock, { interval: interval === '1wk' ? '1wk' : '1d' })
})
