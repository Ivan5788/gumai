import { MOCK_STOCKS } from '../utils/mock-stocks'
import { buildMockCandles } from '../utils/mock-history'
import { buildMockInstitutional } from '../utils/mock-institutional'
import { buildMockBigPower } from '../utils/mock-bigpower'
import { scanSignals } from '../utils/signal-scanner'

// GET /api/signals?q=&types=golden_cross,gap_up&direction=bullish|bearish&market=TW|US&days=10
// 近期關鍵訊號事件，依日期新到舊排序。
export default defineEventHandler((event) => {
  const query = getQuery(event)
  const q = String(query.q || '').trim().toLowerCase()
  const market = query.market ? String(query.market).toUpperCase() : null
  const direction = query.direction === 'bullish' || query.direction === 'bearish' ? query.direction : null
  const days = Math.min(Math.max(Number(query.days) || 10, 1), 60)
  const types = String(query.types || '')
    .split(',')
    .map((s) => s.trim())
    .filter((id) => SIGNAL_IDS.includes(id))

  let universe = MOCK_STOCKS
  if (market === 'TW' || market === 'US') {
    universe = universe.filter((s) => s.market === market)
  }

  let events = []
  for (const stock of universe) {
    const ctx = {
      stock,
      candles: buildMockCandles(stock, { interval: '1d', pinLast: false }),
      institutional: buildMockInstitutional(stock, { interval: '1d' }),
      bigPower: buildMockBigPower(stock, { interval: '1d' })
    }

    for (const ev of scanSignals(ctx, days)) {
      const meta = signalMeta(ev.signalId)
      if (!meta) continue
      events.push({
        date: ev.date,
        symbol: stock.symbol,
        name: stock.name,
        market: stock.market,
        signalId: ev.signalId,
        label: meta.label,
        direction: meta.direction
      })
    }
  }

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
    events: events.slice(0, 200),
    isMock: true
  }
})
