import { resolveStock } from '../../../utils/stock-resolver'
import { assembleHolders, buildMockHolders } from '../../../utils/mock-institutional'
import { getTdccHolders } from '../../../utils/tdcc'

const TDCC_ENABLED = process.env.NUXT_TDCC_ENABLED !== 'false'
// 本次啟動已經觸發過背景回補的代號，避免同一檔在回補完成前被重複觸發。
const backfillTriggered = new Set()

// GET /api/stocks/:symbol/holders
// 大戶（≥1,000 張）／散戶（≤100 張）持股。台股取自集保結算所（每週結算）。
export default defineEventHandler(async (event) => {
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()

  const stock = await resolveStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, message: `找不到股票代號 ${symbol}` })
  }

  if (TDCC_ENABLED && stock.market === 'TW' && stock.listing) {
    // 一律不同步等歷史回補——集保逐週查詢一檔要好幾秒到十幾秒不等（要先各拿一次性
    // token 再查，偶爾比預期慢很多），不管有沒有命中最新一週快照都可能發生。
    // 歷史不足時背景補一次（之後永久快取，下次造訪同一檔就完整），
    // 這次先用當下有的（可能只有最新一週，甚至沒有）快速回應。
    if (!backfillTriggered.has(stock.symbol)) {
      backfillTriggered.add(stock.symbol)
      getTdccHolders(stock.symbol, { backfill: true }).catch(() => {})
    }
    try {
      const t = await getTdccHolders(stock.symbol, { backfill: false })
      if (t && t.history.length) {
        return assembleHolders(stock, t.history, 'tdcc')
      }
    } catch {
      // 落回示範資料
    }
  }

  return buildMockHolders(stock)
})
