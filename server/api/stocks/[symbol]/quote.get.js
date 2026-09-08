import { findMockStock } from '../../../utils/mock-stocks'
import { resolveQuote } from '../../../utils/stock-quote'

// GET /api/stocks/:symbol/quote
// 輕量報價端點，供瀏覽器端輪詢。台股上市：以證交所實際昨收為基準。
// 未來由 Spring Boot 的 WebSocket / SSE 取代（見 app/composables/useRealtimeQuote.js）。
export default defineEventHandler(async (event) => {
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()

  const stock = findMockStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, statusMessage: `找不到股票代號 ${symbol}` })
  }

  setHeader(event, 'Cache-Control', 'no-store')

  const { quote, previousCloseSource } = await resolveQuote(stock)
  return {
    symbol: stock.symbol,
    market: stock.market,
    name: stock.name,
    previousCloseSource,
    ...quote
  }
})
