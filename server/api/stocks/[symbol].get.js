import { resolveStock } from '../../utils/stock-resolver'
import { resolveQuote } from '../../utils/stock-quote'

// GET /api/stocks/:symbol
// 基本資訊 + 一組報價快照。台股上市股票的昨收取自證交所實際收盤。
export default defineEventHandler(async (event) => {
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()

  const stock = await resolveStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, message: `找不到股票代號 ${symbol}` })
  }

  const { previousClose, previousCloseSource, quote } = await resolveQuote(stock)

  return {
    symbol: stock.symbol,
    market: stock.market,
    name: stock.name,
    nameEn: stock.nameEn,
    industry: stock.industry,
    currency: stock.currency,
    previousClose,
    previousCloseSource,
    quote,
    isMock: previousCloseSource !== 'twse'
  }
})
