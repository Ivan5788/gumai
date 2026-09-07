import { buildLiveQuote, findMockStock } from '../../../utils/mock-stocks'

// GET /api/stocks/:symbol/quote
// 輕量的即時報價端點，供瀏覽器端輪詢。
// 未來由 Spring Boot 的 WebSocket / SSE 取代（見 app/composables/useRealtimeQuote.js）。
export default defineEventHandler((event) => {
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()

  const stock = findMockStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, statusMessage: `找不到股票代號 ${symbol}` })
  }

  // 輪詢資料不需快取
  setHeader(event, 'Cache-Control', 'no-store')

  return {
    symbol: stock.symbol,
    market: stock.market,
    name: stock.name,
    ...buildLiveQuote(stock)
  }
})
