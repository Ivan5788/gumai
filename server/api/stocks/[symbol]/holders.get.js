import { resolveStock } from '../../../utils/stock-resolver'
import { assembleHolders, buildMockHolders } from '../../../utils/mock-institutional'
import { getTdccHolders } from '../../../utils/tdcc'

const TDCC_ENABLED = process.env.NUXT_TDCC_ENABLED !== 'false'

// GET /api/stocks/:symbol/holders
// 大戶（≥1,000 張）／散戶（≤100 張）持股。台股取自集保結算所（每週結算）。
export default defineEventHandler(async (event) => {
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()

  const stock = await resolveStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, message: `找不到股票代號 ${symbol}` })
  }

  if (TDCC_ENABLED && stock.market === 'TW' && stock.listing) {
    try {
      const t = await getTdccHolders(stock.symbol)
      if (t && t.history.length) {
        return assembleHolders(stock, t.history, 'tdcc')
      }
    } catch {
      // 落回示範資料
    }
  }

  return buildMockHolders(stock)
})
