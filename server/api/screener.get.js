import { getPoolSnapshot } from '../utils/pool-snapshot'

// GET /api/screener?rules=above_ma60,volume_surge&match=all|any&market=TW|US
// 對股票池的指標快照套用選定條件。
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const market = q.market ? String(q.market).toUpperCase() : null
  const matchMode = q.match === 'any' ? 'any' : 'all'
  const ruleIds = String(q.rules || '')
    .split(',')
    .map((s) => s.trim())
    .filter((id) => SCREENER_RULE_IDS.includes(id))

  const snap = await getPoolSnapshot()
  let rows = snap.rows
  if (market === 'TW' || market === 'US') rows = rows.filter((r) => r.market === market)

  const results = []
  for (const r of rows) {
    const matched = ruleIds.filter((id) => r.flags[id])
    const pass =
      ruleIds.length === 0 ||
      (matchMode === 'all' ? matched.length === ruleIds.length : matched.length > 0)
    if (!pass) continue
    results.push({
      symbol: r.symbol,
      name: r.name,
      market: r.market,
      industry: r.industry,
      price: r.close,
      change: r.change,
      changePercent: r.changePercent,
      matched
    })
  }

  setHeader(event, 'Cache-Control', 'no-store')

  return {
    match: matchMode,
    market: market || 'ALL',
    rules: ruleIds,
    count: results.length,
    poolSize: snap.rows.length,
    source: snap.source,
    results
  }
})
