import { getMarketWideSnapshot, TECH_RULE_IDS } from '../../utils/market-wide'

function round2(v) {
  return Math.round(v * 100) / 100
}

// GET /api/screener/market-wide?rules=above_short_mas,volume_surge,break_20d_high&match=all|any
// 全市場技術面快篩（上市全部 + 上櫃逐日累積），只支援純技術面規則（只吃K線，
// 不含三大法人/大戶持股，見 market-wide.js 開頭說明）。
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const matchMode = q.match === 'any' ? 'any' : 'all'
  const ruleIds = String(q.rules || '')
    .split(',')
    .map((s) => s.trim())
    .filter((id) => TECH_RULE_IDS.includes(id))

  const { meta, store } = await getMarketWideSnapshot()

  const results = []
  for (const [symbol, entry] of store) {
    const candles = entry.candles
    if (!candles.length) continue

    const matched = ruleIds.filter((id) => entry.flags?.[id])
    const pass =
      ruleIds.length === 0 ||
      (matchMode === 'all' ? matched.length === ruleIds.length : matched.length > 0)
    if (!pass) continue

    const last = candles[candles.length - 1]
    const prev = candles[candles.length - 2]
    const change = prev ? round2(last.close - prev.close) : 0
    results.push({
      symbol,
      name: entry.name,
      market: 'TW',
      listing: entry.listing,
      price: last.close,
      change,
      changePercent: prev?.close ? round2((change / prev.close) * 100) : 0,
      matched
    })
  }

  results.sort((a, b) => a.symbol.localeCompare(b.symbol))

  setHeader(event, 'Cache-Control', 'no-store')

  return {
    match: matchMode,
    rules: ruleIds,
    count: results.length,
    poolSize: store.size,
    backfillDone: meta.backfillDone,
    lastTwseDate: meta.lastTwseDate,
    lastTpexDate: meta.lastTpexDate,
    updatedAt: meta.updatedAt ? new Date(meta.updatedAt).toISOString() : null,
    results
  }
})
