import { resolveStock } from '../../../utils/stock-resolver'
import { assembleInstitutional, buildMockInstitutional } from '../../../utils/mock-institutional'
import { getFinmindInstitutional } from '../../../utils/finmind'

const FINMIND_ENABLED = process.env.NUXT_FINMIND_ENABLED !== 'false'

// GET /api/stocks/:symbol/institutional?interval=1d|1wk
// 三大法人買賣超。台股上市取自 FinMind（證交所盤後彙總資料）；其餘示範。
export default defineEventHandler(async (event) => {
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()
  const interval = getQuery(event).interval === '1wk' ? '1wk' : '1d'

  const stock = await resolveStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, message: `找不到股票代號 ${symbol}` })
  }

  if (FINMIND_ENABLED && stock.market === 'TW' && stock.listing === 'TWSE') {
    try {
      const days = await getFinmindInstitutional(stock.symbol)
      if (days.length >= 10) {
        return assembleInstitutional(stock, days, { interval, source: 'finmind' })
      }
    } catch {
      // 落回示範資料
    }
  }

  return buildMockInstitutional(stock, { interval })
})
