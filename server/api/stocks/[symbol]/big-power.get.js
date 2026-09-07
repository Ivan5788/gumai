import { findMockStock } from '../../../utils/mock-stocks'
import { buildMockBigPower } from '../../../utils/mock-bigpower'

// GET /api/stocks/:symbol/big-power?interval=1d|1wk|60m
// 大戶買賣力 =（特大單 + 大單）×（外盤 − 內盤）。台股專屬，需逐筆資料。
export default defineEventHandler((event) => {
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()
  const { interval } = getQuery(event)

  const stock = findMockStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, statusMessage: `找不到股票代號 ${symbol}` })
  }

  return buildMockBigPower(stock, { interval })
})
