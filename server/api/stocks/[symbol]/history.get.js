import { findMockStock } from '../../../utils/mock-stocks'
import { buildMockCandles } from '../../../utils/mock-history'

// GET /api/stocks/:symbol/history?interval=1d|1wk&limit=120
// 日 K / 週 K 歷史資料。
export default defineEventHandler((event) => {
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()
  const { interval = '1d', limit } = getQuery(event)

  const stock = findMockStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, statusMessage: `找不到股票代號 ${symbol}` })
  }

  const normalizedInterval = interval === '1wk' ? '1wk' : '1d'

  return {
    symbol: stock.symbol,
    market: stock.market,
    interval: normalizedInterval,
    candles: buildMockCandles(stock, {
      interval: normalizedInterval,
      limit: limit ? Number(limit) : normalizedInterval === '1wk' ? 80 : 120
    }),
    isMock: true
  }
})
