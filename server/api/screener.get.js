import { MOCK_STOCKS, buildLiveQuote } from '../utils/mock-stocks'
import { buildMockCandles } from '../utils/mock-history'
import { buildMockInstitutional, buildMockHolders } from '../utils/mock-institutional'
import { buildMockBigPower } from '../utils/mock-bigpower'
import { RULE_TESTS } from '../utils/screener-rules'

// GET /api/screener?rules=above_ma60,volume_surge&match=all|any&market=TW|US
// 選股：對股票池套用選定條件，回傳符合的清單。
export default defineEventHandler((event) => {
  const q = getQuery(event)
  const market = q.market ? String(q.market).toUpperCase() : null
  const matchMode = q.match === 'any' ? 'any' : 'all'
  const ruleIds = String(q.rules || '')
    .split(',')
    .map((s) => s.trim())
    .filter((id) => RULE_TESTS[id])

  let universe = MOCK_STOCKS
  if (market === 'TW' || market === 'US') {
    universe = universe.filter((s) => s.market === market)
  }

  const results = []

  for (const stock of universe) {
    const candles = buildMockCandles(stock, { interval: '1d', pinLast: false })

    let matched = []
    if (ruleIds.length > 0) {
      const ctx = {
        stock,
        candles,
        institutional: buildMockInstitutional(stock, { interval: '1d' }),
        holders: buildMockHolders(stock, { interval: '1d' }),
        bigPower: buildMockBigPower(stock, { interval: '1d' })
      }
      matched = ruleIds.filter((id) => {
        try {
          return RULE_TESTS[id](ctx)
        } catch {
          return false
        }
      })

      const pass = matchMode === 'all' ? matched.length === ruleIds.length : matched.length > 0
      if (!pass) continue
    }

    const quote = buildLiveQuote(stock)
    results.push({
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market,
      industry: stock.industry,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      matched
    })
  }

  setHeader(event, 'Cache-Control', 'no-store')

  return {
    match: matchMode,
    market: market || 'ALL',
    rules: ruleIds,
    count: results.length,
    results,
    isMock: true
  }
})
