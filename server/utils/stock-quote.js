import { buildLiveQuote } from './mock-stocks'
import { getTwseDailyCandles } from './twse'

const TWSE_ENABLED = process.env.NUXT_TWSE_ENABLED !== 'false'

// 台股上市：昨收取自證交所實際收盤，quote 在其附近變動（示範用，非真實即時）。
// 其餘：完全示範資料。
export async function resolveQuote(stock) {
  let previousClose = stock.previousClose
  let real = false

  if (TWSE_ENABLED && stock.listing === 'TWSE') {
    try {
      const daily = await getTwseDailyCandles(stock.symbol, 2)
      if (daily.length) {
        previousClose = daily[daily.length - 1].close
        real = true
      }
    } catch {
      // 用 mock 昨收
    }
  }

  return {
    previousClose,
    previousCloseSource: real ? 'twse' : 'mock',
    quote: buildLiveQuote({ ...stock, previousClose })
  }
}
