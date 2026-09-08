import { buildLiveQuote } from './mock-stocks'
import { getTwseDailyCandles } from './twse'
import { getYahooDaily } from './yahoo'

const TWSE_ENABLED = process.env.NUXT_TWSE_ENABLED !== 'false'
const YAHOO_ENABLED = process.env.NUXT_YAHOO_ENABLED !== 'false'

// 昨收：台股上市 → 證交所實際收盤；美股 → Yahoo。
// quote 在昨收附近變動（示範用盤中，非真實即時）。
export async function resolveQuote(stock) {
  let previousClose = stock.previousClose
  let source = 'mock'

  try {
    if (TWSE_ENABLED && stock.listing === 'TWSE') {
      const daily = await getTwseDailyCandles(stock.symbol, 2)
      if (daily.length) {
        previousClose = daily[daily.length - 1].close
        source = 'twse'
      }
    } else if (YAHOO_ENABLED && stock.market === 'US') {
      const daily = await getYahooDaily(stock)
      if (daily.length) {
        previousClose = daily[daily.length - 1].close
        source = 'yahoo'
      }
    }
  } catch {
    // 用 mock 昨收
  }

  return {
    previousClose,
    previousCloseSource: source,
    quote: buildLiveQuote({ ...stock, previousClose })
  }
}
