import { buildLiveQuote } from './mock-stocks'
import { getTwseDailyCandles } from './twse'
import { getYahooQuote } from './yahoo'
import { getMisQuote, misExCh } from './twse-mis'

const TWSE_ENABLED = process.env.NUXT_TWSE_ENABLED !== 'false'
const YAHOO_ENABLED = process.env.NUXT_YAHOO_ENABLED !== 'false'
const MIS_ENABLED = process.env.NUXT_MIS_ENABLED !== 'false'

function taipeiDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(date)
}

// 報價來源優先序：
//   1. 收盤後（台股上市）：證交所當天正式成交資料（已出來才用，見下方）——收盤瞬間
//      MIS 常常還沒計入最後幾秒集合競價撮合的量，Yahoo 延遲報價更可能卡在收盤前一刻，
//      兩者的成交量都可能比官方最終值少一些；官方資料出來之後就是最準的。
//   2. 台股：證交所 MIS 盤中即時（約 5 秒延遲，真實價量；MIS 過去測過不穩，失敗即落下一層）
//   3. Yahoo 延遲即時（約 15–20 分，真實價量）
//   4. 台股上市：證交所實際昨收 + 模擬盤中（buildLiveQuote）
//   5. 完全示範
export async function resolveQuote(stock) {
  if (TWSE_ENABLED && stock.listing === 'TWSE' && !isMarketOpen('TW')) {
    try {
      const daily = await getTwseDailyCandles(stock.symbol, 2)
      const today = taipeiDateKey()
      const last = daily[daily.length - 1]
      const prev = daily[daily.length - 2]
      // 只有證交所「今天」的資料已經出來才用這條；還沒出來（剛收盤那段時間）就
      // 維持原本 MIS → Yahoo 的順序，不要誤把昨天的收盤當今天用。
      if (last?.time === today && prev) {
        const change = Math.round((last.close - prev.close) * 100) / 100
        return {
          previousClose: prev.close,
          previousCloseSource: 'twse',
          quote: {
            price: last.close,
            change,
            changePercent: prev.close ? Math.round((change / prev.close) * 10000) / 100 : 0,
            open: last.open,
            high: last.high,
            low: last.low,
            previousClose: prev.close,
            volume: last.volume,
            updatedAt: new Date().toISOString(),
            source: 'twse'
          }
        }
      }
    } catch {
      // 落到下一層
    }
  }

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
