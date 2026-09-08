import { findMockStock } from '../../../utils/mock-stocks'
import { buildMockCandles } from '../../../utils/mock-history'
import { getTwseDailyCandles, aggregateWeeklyCandles } from '../../../utils/twse'

const INTERVALS = ['1d', '1wk', '60m']
const TWSE_ENABLED = process.env.NUXT_TWSE_ENABLED !== 'false'

// GET /api/stocks/:symbol/history?interval=1d|1wk|60m
// 日 K / 週 K / 60 分 K。
// 台股上市股票的日 K / 週 K 取自臺灣證券交易所；其餘（60 分 K、美股、上櫃）暫用示範資料。
export default defineEventHandler(async (event) => {
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()
  const { interval, limit } = getQuery(event)

  const stock = findMockStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, statusMessage: `找不到股票代號 ${symbol}` })
  }

  const normalizedInterval = INTERVALS.includes(interval) ? interval : '1d'
  const wantsTwse =
    TWSE_ENABLED &&
    stock.listing === 'TWSE' &&
    (normalizedInterval === '1d' || normalizedInterval === '1wk')

  if (wantsTwse) {
    try {
      const daily = await getTwseDailyCandles(stock.symbol, 8)
      if (daily.length >= 20) {
        const candles = normalizedInterval === '1wk' ? aggregateWeeklyCandles(daily) : daily
        return {
          symbol: stock.symbol,
          market: stock.market,
          interval: normalizedInterval,
          candles,
          source: 'twse',
          isMock: false
        }
      }
    } catch {
      // 落回示範資料
    }
  }

  return {
    symbol: stock.symbol,
    market: stock.market,
    interval: normalizedInterval,
    candles: buildMockCandles(stock, {
      interval: normalizedInterval,
      limit: limit ? Number(limit) : undefined
    }),
    source: 'mock',
    isMock: true
  }
})
