// weightedListFor 來自 shared/utils/index-constituents.js（shared/utils 在 app 與 server 皆自動匯入，不需 import）
import { resolveStock } from '../../../utils/stock-resolver'
import { resolveQuote } from '../../../utils/stock-quote'
import { mapLimit } from '../../../utils/concurrency'

const TTL = 5 * 60 * 1000
const cache = new Map() // market -> { at, data }

// GET /api/market/weighted/:market（TWSE｜TPEX）—— 大型權值股靜態清單 + 即時報價
export default defineEventHandler(async (event) => {
  const market = String(getRouterParam(event, 'market') || '').trim().toUpperCase()
  const list = weightedListFor(market)
  if (!list) {
    throw createError({ statusCode: 404, message: `找不到權值清單 ${market}` })
  }

  const cached = cache.get(market)
  if (cached && Date.now() - cached.at < TTL) {
    setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=1800')
    return cached.data
  }

  // 有限並行（見 concurrency.js）：台股 TWSE 部分仍受 twse.js 的全域節流佇列保護，
  // 速度不會變快；但等佇列輪到的空檔可以順便處理其他檔的 FinMind/Yahoo 查詢，
  // 上櫃股（完全不碰 TWSE）跟整體冷啟動時間明顯縮短。
  const items = await mapLimit(list, 6, async (entry, i) => {
    const row = { rank: i + 1, symbol: entry.symbol, name: entry.name, industry: null, price: null, change: null, changePercent: null }
    try {
      const stock = await resolveStock(entry.symbol)
      if (stock) {
        row.name = stock.name || entry.name
        row.industry = stock.industry
        // previousClose 都拿不到時（少數上櫃股 Yahoo 也沒有），resolveQuote 會落到
        // mock 假報價（以 0 為底），顯示出來反而失真——寧可留白（—）也不要顯示假數字。
        if (stock.previousClose != null) {
          const { quote } = await resolveQuote(stock)
          if (!quote.isMock) {
            row.price = quote.price ?? null
            row.change = quote.change ?? null
            row.changePercent = quote.changePercent ?? null
          }
        }
      }
    } catch {
      // 保留代號/名稱，報價留空
    }
    return row
  })

  const data = {
    market,
    label: market === 'TWSE' ? '上市' : '上櫃',
    updatedAt: new Date().toISOString(),
    total: items.length,
    isStaticList: true,
    items
  }
  cache.set(market, { at: Date.now(), data })

  setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=1800')
  return data
})
