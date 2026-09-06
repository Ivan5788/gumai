import { buildMockQuote, findMockStock } from '../../utils/mock-stocks'

// GET /api/stocks/:symbol
// 單一個股的基本資訊 + 一組報價快照。
// - 基本資訊（name / industry / previousClose）變動慢，適合 SSR 並快取，供 SEO 使用
// - quote 之後會由後端提供真實即時值，並在瀏覽器端持續更新
export default defineEventHandler((event) => {
  const raw = getRouterParam(event, 'symbol')
  const symbol = String(raw || '').trim().toUpperCase()

  const stock = findMockStock(symbol)

  if (!stock) {
    throw createError({
      statusCode: 404,
      statusMessage: `找不到股票代號 ${symbol}`
    })
  }

  return {
    symbol: stock.symbol,
    market: stock.market,
    name: stock.name,
    nameEn: stock.nameEn,
    industry: stock.industry,
    currency: stock.currency,
    previousClose: stock.previousClose,
    quote: buildMockQuote(stock),
    isMock: true
  }
})
