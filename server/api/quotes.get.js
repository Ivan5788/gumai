import { findMockStock } from '../utils/mock-stocks'
import { resolveQuote } from '../utils/stock-quote'

// GET /api/quotes?symbols=2330,AAPL — 多檔報價快照（收藏頁用）
export default defineEventHandler(async (event) => {
  const { symbols } = getQuery(event)
  const list = String(symbols || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 100)

  setHeader(event, 'Cache-Control', 'no-store')

  const quotes = []
  for (const symbol of list) {
    const stock = findMockStock(symbol)
    if (!stock) continue
    const { quote } = await resolveQuote(stock)
    quotes.push({
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent
    })
  }

  return { quotes }
})
