import { findMockStock } from '../../../utils/mock-stocks'
import { buildMockHolders } from '../../../utils/mock-institutional'

// GET /api/stocks/:symbol/holders
// 大戶／散戶持股比例（模擬集保戶股權分散表）。台股專屬，週更新。
export default defineEventHandler((event) => {
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()

  const stock = findMockStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, statusMessage: `找不到股票代號 ${symbol}` })
  }

  return buildMockHolders(stock)
})
