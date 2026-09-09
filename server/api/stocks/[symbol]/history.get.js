import { resolveStock } from '../../../utils/stock-resolver'
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

  const stock = await resolveStock(symbol)
  if (!stock) {
    throw createError({ statusCode: 404, message: `找不到股票代號 ${symbol}` })
  }

  const iv = INTERVALS.includes(interval) ? interval : '1d'
  const ok = (candles, source) =>
    candles && candles.length >= 20
      ? { symbol: stock.symbol, market: stock.market, interval: iv, candles, source, isMock: false }
      : null

  // 走勢圖預設涵蓋約 2 年（週K 約 2 年、60分K 維持近 3 個月）
  const defaultLimit = iv === '1wk' ? 110 : iv === '60m' ? undefined : 500
  const fallback = () => ({
    symbol: stock.symbol,
    market: stock.market,
    interval: iv,
    candles: buildMockCandles(stock, {
      interval: iv,
      limit: limit ? Number(limit) : defaultLimit
    }),
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
  // 同步抓最近 12 個月，更早 12 個月背景補齊（下次載入即完整 ~2 年）
  if ((iv === '1d' || iv === '1wk') && TWSE_ENABLED && stock.listing === 'TWSE') {
    try {
      const daily = await getTwseDailyCandles(stock.symbol, 12, { backgroundMonths: 12 })
      const candles = iv === '1wk' ? aggregateWeeklyCandles(daily) : daily
      const res = ok(candles, 'twse')
      if (res) return res
    } catch {
      // 落回
    }
  }

  // 美股 / 台股上櫃 日/週 K → Yahoo
  if ((iv === '1d' || iv === '1wk') && YAHOO_ENABLED && (stock.market === 'US' || stock.listing === 'TPEx')) {
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
