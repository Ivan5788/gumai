import { findMockStock } from '../../../utils/mock-stocks'
import { buildMockCandles } from '../../../utils/mock-history'
import { getTwseDailyCandles, aggregateWeeklyCandles } from '../../../utils/twse'
import { getYahooHourly, getYahooDaily } from '../../../utils/yahoo'

const INTERVALS = ['1d', '1wk', '60m']
const TWSE_ENABLED = process.env.NUXT_TWSE_ENABLED !== 'false'
const YAHOO_ENABLED = process.env.NUXT_YAHOO_ENABLED !== 'false'

// GET /api/stocks/:symbol/history?interval=1d|1wk|60m
// 資料來源：
//   台股上市 日K/週K → 臺灣證券交易所
//   美股 日K/週K → Yahoo Finance
//   60 分 K（各市場）→ Yahoo Finance
//   其餘（上櫃等）→ 示範資料
export default defineEventHandler(async (event) => {
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()
  const { interval, limit } = getQuery(event)

  const stock = findMockStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, statusMessage: `找不到股票代號 ${symbol}` })
  }

  const iv = INTERVALS.includes(interval) ? interval : '1d'
  const ok = (candles, source) =>
    candles && candles.length >= 20
      ? { symbol: stock.symbol, market: stock.market, interval: iv, candles, source, isMock: false }
      : null

  const fallback = () => ({
    symbol: stock.symbol,
    market: stock.market,
    interval: iv,
    candles: buildMockCandles(stock, { interval: iv, limit: limit ? Number(limit) : undefined }),
    source: 'mock',
    isMock: true
  })

  // 60 分 K → Yahoo
  if (iv === '60m' && YAHOO_ENABLED) {
    try {
      return ok(await getYahooHourly(stock), 'yahoo') || fallback()
    } catch {
      return fallback()
    }
  }

  // 台股上市日/週 K → 證交所
  if ((iv === '1d' || iv === '1wk') && TWSE_ENABLED && stock.listing === 'TWSE') {
    try {
      const daily = await getTwseDailyCandles(stock.symbol, 8)
      const candles = iv === '1wk' ? aggregateWeeklyCandles(daily) : daily
      const res = ok(candles, 'twse')
      if (res) return res
    } catch {
      // 落回
    }
  }

  // 美股日/週 K → Yahoo
  if ((iv === '1d' || iv === '1wk') && YAHOO_ENABLED && stock.market === 'US') {
    try {
      const daily = await getYahooDaily(stock)
      const candles = iv === '1wk' ? aggregateWeeklyCandles(daily) : daily
      const res = ok(candles, 'yahoo')
      if (res) return res
    } catch {
      // 落回
    }
  }

  return fallback()
})
