import { MOCK_STOCKS } from '../../utils/mock-stocks'

// GET /api/stocks?market=TW&q=台積
// 股票清單。之後供搜尋、選股結果、收藏頁使用。
export default defineEventHandler((event) => {
  const { market, q } = getQuery(event)

  let items = MOCK_STOCKS.map((s) => ({
    symbol: s.symbol,
    market: s.market,
    name: s.name,
    nameEn: s.nameEn,
    industry: s.industry
  }))

  if (market) {
    const code = String(market).toUpperCase()
    items = items.filter((s) => s.market === code)
  }

  if (q) {
    const keyword = String(q).trim().toLowerCase()
    items = items.filter(
      (s) =>
        s.symbol.toLowerCase().includes(keyword) ||
        s.name.toLowerCase().includes(keyword) ||
        (s.nameEn || '').toLowerCase().includes(keyword)
    )
  }

  return {
    items,
    total: items.length,
    isMock: true
  }
})
