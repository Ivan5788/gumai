import { getPoolSnapshot } from '../utils/pool-snapshot'

// GET /api/signals?q=&types=golden_cross,gap_up&direction=bullish|bearish&market=TW|US&days=10
// 近期關鍵訊號事件，依日期新到舊。資料來自股票池指標快照。
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.q || '').trim().toLowerCase()
  const market = query.market ? String(query.market).toUpperCase() : null
  const direction = query.direction === 'bullish' || query.direction === 'bearish' ? query.direction : null
  const days = Math.min(Math.max(Number(query.days) || 10, 1), 60)
  // 大戶買賣力仍為示範資料，未開放時連帶隱藏該類型——即使直接帶參數呼叫也不會生效
  const allowedIds = visibleSignals(useRuntimeConfig().public.bigPowerEnabled).map((s) => s.id)
  const types = String(query.types || '')
    .split(',')
    .map((s) => s.trim())
    .filter((id) => allowedIds.includes(id))

  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
  const snap = await getPoolSnapshot()

  let events = []
  for (const r of snap.rows) {
    if ((market === 'TW' || market === 'US') && r.market !== market) continue
    for (const ev of r.events) {
      if (ev.date < cutoff) continue
      const meta = signalMeta(ev.signalId)
      if (!meta) continue
      events.push({
        date: ev.date,
        symbol: r.symbol,
        name: r.name,
        market: r.market,
        signalId: ev.signalId,
        label: meta.label,
        direction: meta.direction
      })
    }
  }

  // 未開放的類型（大戶買賣力）永遠濾掉，不只是「有指定 types 時」才濾——
  // 不然預設（不指定 types）的全部訊號清單還是會漏出來
  events = events.filter((e) => allowedIds.includes(e.signalId))
  if (types.length) events = events.filter((e) => types.includes(e.signalId))
  if (direction) events = events.filter((e) => e.direction === direction)
  if (q) {
    events = events.filter((e) => {
      const meta = signalMeta(e.signalId)
      return (
        e.symbol.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        meta.label.toLowerCase().includes(q) ||
        meta.keywords.some((k) => k.toLowerCase().includes(q))
      )
    })
  }

  events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  setHeader(event, 'Cache-Control', 'no-store')

  return {
    q: query.q || '',
    days,
    types,
    direction: direction || 'all',
    market: market || 'ALL',
    count: events.length,
    poolSize: snap.rows.length,
    source: snap.source,
    events: events.slice(0, 300)
  }
})
