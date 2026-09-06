import { findMockStock } from '../../../utils/mock-stocks'
import { buildMockIntraday } from '../../../utils/mock-history'

// GET /api/stocks/:symbol/intraday
// 當日分時走勢。
export default defineEventHandler((event) => {
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()

  const stock = findMockStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, statusMessage: `找不到股票代號 ${symbol}` })
  }

  return {
    symbol: stock.symbol,
    market: stock.market,
    ...buildMockIntraday(stock),
    isMock: true
  }
})
