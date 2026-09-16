import { resolveStock } from '../../../utils/stock-resolver'
import { buildMockBigPower } from '../../../utils/mock-bigpower'

// GET /api/stocks/:symbol/big-power?interval=1d|1wk|60m
// 大戶買賣力 =（特大單 + 大單）×（外盤 − 內盤）。台股專屬，需逐筆資料。
export default defineEventHandler(async (event) => {
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()
  const { interval } = getQuery(event)

  const stock = await resolveStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, message: `找不到股票代號 ${symbol}` })
  }

  if (!useRuntimeConfig().public.bigPowerEnabled) {
    return {
      symbol: stock.symbol,
      market: stock.market,
      available: false,
      reason: '大戶買賣力功能尚未開放，需要付費逐筆成交與內外盤資料，目前僅為示範資料而暫時隱藏。',
      isMock: true
    }
  }

  return buildMockBigPower(stock, { interval })
})
