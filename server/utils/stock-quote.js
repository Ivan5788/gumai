import { buildLiveQuote } from './mock-stocks'
import { getTwseDailyCandles } from './twse'
import { getYahooQuote } from './yahoo'
import { getMisQuote, misExCh } from './twse-mis'

const TWSE_ENABLED = process.env.NUXT_TWSE_ENABLED !== 'false'
const YAHOO_ENABLED = process.env.NUXT_YAHOO_ENABLED !== 'false'
const MIS_ENABLED = process.env.NUXT_MIS_ENABLED !== 'false'

// 報價來源優先序：
//   1. 台股：證交所 MIS 盤中即時（約 5 秒延遲，真實價量；MIS 過去測過不穩，失敗即落下一層）
//   2. Yahoo 延遲即時（約 15–20 分，真實價量）
//   3. 台股上市：證交所實際昨收 + 模擬盤中（buildLiveQuote）
//   4. 完全示範
export async function resolveQuote(stock) {
  if (MIS_ENABLED) {
    try {
      const exCh = misExCh(stock)
      const m = exCh ? await getMisQuote(exCh) : null
      if (m) {
        return {
          previousClose: m.previousClose,
          previousCloseSource: 'mis',
          quote: {
            price: m.price,
            change: m.change,
            changePercent: m.changePercent,
            open: m.open,
            high: m.high,
            low: m.low,
            previousClose: m.previousClose,
            volume: m.volume,
            updatedAt: new Date().toISOString(),
            source: 'twse-mis'
          }
        }
      }
    } catch {
      // 落到下一層
    }
  }

  if (YAHOO_ENABLED) {
    try {
      const y = await getYahooQuote(stock)
      if (y && y.price) {
        return {
          previousClose: y.previousClose,
          previousCloseSource: 'yahoo',
          quote: {
            price: y.price,
            change: y.change,
            changePercent: y.changePercent,
            open: y.open,
            high: y.high,
            low: y.low,
            previousClose: y.previousClose,
            volume: y.volume,
            updatedAt: new Date(y.marketTime).toISOString(),
            source: 'yahoo-delayed'
          }
        }
      }
    } catch {
      // 落到下一層
    }
  }

  let previousClose = stock.previousClose
  let source = 'mock'
  if (TWSE_ENABLED && stock.listing === 'TWSE') {
    try {
      const daily = await getTwseDailyCandles(stock.symbol, 2)
      if (daily.length) {
        previousClose = daily[daily.length - 1].close
        source = 'twse'
      }
    } catch {
      // 用 mock 昨收
    }
  }

  return {
    previousClose,
    previousCloseSource: source,
    quote: { ...buildLiveQuote({ ...stock, previousClose }), source: 'mock' }
  }
}
