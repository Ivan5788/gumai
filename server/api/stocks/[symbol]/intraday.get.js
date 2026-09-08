import { findMockStock } from '../../../utils/mock-stocks'
import { buildMockIntraday } from '../../../utils/mock-history'
import { getYahooIntraday } from '../../../utils/yahoo'

const YAHOO_ENABLED = process.env.NUXT_YAHOO_ENABLED !== 'false'

// GET /api/stocks/:symbol/intraday — 當日分時走勢（Yahoo 1 分 K，約 15–20 分延遲）
export default defineEventHandler(async (event) => {
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()

  const stock = findMockStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, statusMessage: `找不到股票代號 ${symbol}` })
  }

  setHeader(event, 'Cache-Control', 'no-store')

  if (YAHOO_ENABLED) {
    try {
      const data = await getYahooIntraday(stock)
      if (data && data.points.length >= 5) {
        return {
          symbol: stock.symbol,
          market: stock.market,
          date: data.date,
          previousClose: data.previousClose,
          marketOpen: isMarketOpen(stock.market),
          points: data.points,
          source: 'yahoo',
          isMock: false
        }
      }
    } catch {
      // 落回示範資料
    }
  }

  return {
    symbol: stock.symbol,
    market: stock.market,
    ...buildMockIntraday(stock),
    source: 'mock',
    isMock: true
  }
})
