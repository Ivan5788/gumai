import { buildLiveQuote, findMockStock } from '../utils/mock-stocks'

// GET /api/quotes?symbols=2330,AAPL — 多檔即時報價快照
export default defineEventHandler((event) => {
  const { symbols } = getQuery(event)
  const list = String(symbols || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 100)

  setHeader(event, 'Cache-Control', 'no-store')

  const quotes = list
    .map((symbol) => {
      const stock = findMockStock(symbol)
      if (!stock) return null
      const q = buildLiveQuote(stock)
      return {
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent
      }
    })
    .filter(Boolean)

  return { quotes, isMock: true }
})
