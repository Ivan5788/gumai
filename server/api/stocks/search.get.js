import { MOCK_STOCKS } from '../../utils/mock-stocks'

// 搜尋用的本地清單：mock 股票 + 大型權值股靜態清單（symbol/name 皆有）。
// TWSE_WEIGHTED / TPEX_WEIGHTED / normalizeSymbol / isValidSymbol / detectMarket
// 來自 shared/utils，app 與 server 皆自動匯入，不需 import。
let registryCache = null
function registry() {
  if (registryCache) return registryCache
  const map = new Map()
  const add = (symbol, name, market) => {
    if (symbol && !map.has(symbol)) map.set(symbol, { symbol, name, market })
  }
  for (const s of MOCK_STOCKS) add(s.symbol, s.name, s.market)
  for (const s of TWSE_WEIGHTED) add(s.symbol, s.name, 'TW')
  for (const s of TPEX_WEIGHTED) add(s.symbol, s.name, 'TW')
  registryCache = [...map.values()]
  return registryCache
}

// GET /api/stocks/search?q=關鍵字或代號 —— 供頁首搜尋用
export default defineEventHandler((event) => {
  const { q } = getQuery(event)
  const query = String(q || '').trim()
  if (!query) return { items: [], directMatch: null }

  const keyword = query.toLowerCase()
  const items = registry()
    .filter((s) => s.symbol.toLowerCase().includes(keyword) || s.name.toLowerCase().includes(keyword))
    .sort((a, b) => {
      // 代號/名稱完全命中或開頭命中的排前面
      const score = (s) => {
        const sym = s.symbol.toLowerCase()
        const name = s.name.toLowerCase()
        if (sym === keyword || name === keyword) return 0
        if (sym.startsWith(keyword) || name.startsWith(keyword)) return 1
        return 2
      }
      return score(a) - score(b)
    })
    .slice(0, 10)

  // 查詢本身就像有效代號、但不在本地清單內時，額外給「直接前往」選項
  // （個股頁本身能 resolve 任何上市/上櫃/美股代號，不限於這份清單）
  let directMatch = null
  const normalized = normalizeSymbol(query)
  if (isValidSymbol(normalized) && !items.some((s) => s.symbol === normalized)) {
    directMatch = { symbol: normalized, market: detectMarket(normalized) }
  }

  return { items, directMatch }
})
