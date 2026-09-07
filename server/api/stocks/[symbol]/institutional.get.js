import { findMockStock } from '../../../utils/mock-stocks'
import { buildMockInstitutional } from '../../../utils/mock-institutional'

// GET /api/stocks/:symbol/institutional
// 三大法人（外資 / 投信 / 自營商）買賣超。台股專屬，盤後彙總資料。
export default defineEventHandler((event) => {
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()

  const stock = findMockStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, statusMessage: `找不到股票代號 ${symbol}` })
  }

  return buildMockInstitutional(stock)
})
