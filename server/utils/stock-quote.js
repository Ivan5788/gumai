import { buildLiveQuote } from './mock-stocks'
import { getTwseDailyCandles } from './twse'
import { getYahooQuote } from './yahoo'

const TWSE_ENABLED = process.env.NUXT_TWSE_ENABLED !== 'false'
const YAHOO_ENABLED = process.env.NUXT_YAHOO_ENABLED !== 'false'

// 報價來源優先序：
//   1. Yahoo 延遲即時（約 15–20 分，真實價量）
//   2. 台股上市：證交所實際昨收 + 模擬盤中（buildLiveQuote）
//   3. 完全示範
export async function resolveQuote(stock) {
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
