// Yahoo Finance chart API（非官方）。
// 用在：60 分 K（證交所無此資料）、美股日 K / 週 K。
// 支援 .TW（上市）/ .TWO（上櫃）/ 美股原代號。

const BASE = 'https://query1.finance.yahoo.com/v8/finance/chart'
const TTL = { '60m': 10 * 60 * 1000, '1d': 60 * 60 * 1000, '1wk': 60 * 60 * 1000 }

function round2(v) {
  return Math.round(v * 100) / 100
}

export function yahooSymbol(stock) {
  if (stock.market === 'US') return stock.symbol
  if (stock.listing === 'TPEx') return `${stock.symbol}.TWO`
  return `${stock.symbol}.TW`
}

async function fetchChart(ySymbol, interval, range) {
  const res = await $fetch(`${BASE}/${encodeURIComponent(ySymbol)}`, {
    params: { interval, range, includePrePost: 'false' },
    headers: { 'User-Agent': 'Mozilla/5.0 (StockPulse)' },
    timeout: 12000,
    retry: 0
  })

  const r = res?.chart?.result?.[0]
  if (!r || !Array.isArray(r.timestamp)) return []

  const q = r.indicators?.quote?.[0] || {}
  const isTW = r.meta?.currency === 'TWD'
  const intraday = interval !== '1d' && interval !== '1wk'
  const offset = intraday ? Number(r.meta?.gmtoffset || 0) : 0

  const out = []
  for (let i = 0; i < r.timestamp.length; i += 1) {
    const o = q.open?.[i]
    const h = q.high?.[i]
    const l = q.low?.[i]
    const c = q.close?.[i]
    const v = q.volume?.[i]
    if (o == null || h == null || l == null || c == null) continue
    // 過濾收盤後的空 bar（o=h=l=c 且無量）
    if ((v == null || v === 0) && o === h && h === l && l === c) continue

    const ts = r.timestamp[i]
    out.push({
      time: intraday ? ts + offset : new Date(ts * 1000).toISOString().slice(0, 10),
      open: round2(o),
      high: round2(h),
      low: round2(l),
      close: round2(c),
      volume: Math.round((v || 0) / (isTW ? 1000 : 1))
    })
  }
  return out
}

async function getCached(ySymbol, interval, range) {
  const key = `yahoo:${interval}:${ySymbol}`
  const store = useStorage('data')
  const cached = await store.getItem(key)
  const ttl = TTL[interval] || 60 * 60 * 1000
  if (cached && Date.now() - cached.at < ttl) return cached.rows

  try {
    const rows = await fetchChart(ySymbol, interval, range)
    if (rows.length) await store.setItem(key, { at: Date.now(), rows })
    return rows.length ? rows : cached?.rows || []
  } catch {
    return cached?.rows || []
  }
}

// 代號 meta（名稱 / 幣別 / 昨收）。供代號解析用。
export async function getYahooMeta(symbol) {
  const key = `yahoo:meta:${symbol}`
  const store = useStorage('data')
  const cached = await store.getItem(key)
  if (cached && Date.now() - cached.at < 24 * 60 * 60 * 1000) return cached.value

  try {
    const res = await $fetch(`${BASE}/${encodeURIComponent(symbol)}`, {
      params: { interval: '1d', range: '5d' },
      headers: { 'User-Agent': 'Mozilla/5.0 (StockPulse)' },
      timeout: 10000,
      retry: 0
    })
    const m = res?.chart?.result?.[0]?.meta
    if (!m || m.instrumentType === 'INDEX') return cached?.value || null
    const value = {
      name: m.shortName || m.longName || symbol,
      currency: m.currency || 'USD',
      previousClose: m.chartPreviousClose ?? m.previousClose ?? null,
      exchange: m.exchangeName || null
    }
    await store.setItem(key, { at: Date.now(), value })
    return value
  } catch {
    return cached?.value || null
  }
}

export function getYahooHourly(stock) {
  return getCached(yahooSymbol(stock), '60m', '3mo')
}

export function getYahooDaily(stock) {
  return getCached(yahooSymbol(stock), '1d', '1y')
}

// 當日分時走勢（1 分 K）。回傳 { date, previousClose, points: [{ time, price, volume }] }
export async function getYahooIntraday(stock) {
  const ySymbol = yahooSymbol(stock)
  const key = `yahoo:1m:${ySymbol}`
  const store = useStorage('data')
  const cached = await store.getItem(key)
  if (cached && Date.now() - cached.at < 90 * 1000) return cached.value

  try {
    const res = await $fetch(`${BASE}/${encodeURIComponent(ySymbol)}`, {
      params: { interval: '1m', range: '1d', includePrePost: 'false' },
      headers: { 'User-Agent': 'Mozilla/5.0 (StockPulse)' },
      timeout: 12000,
      retry: 0
    })
    const r = res?.chart?.result?.[0]
    if (!r || !Array.isArray(r.timestamp)) return cached?.value || null

    const q = r.indicators?.quote?.[0] || {}
    const isTW = r.meta?.currency === 'TWD'
    const offset = Number(r.meta?.gmtoffset || 0)

    const points = []
    for (let i = 0; i < r.timestamp.length; i += 1) {
      const c = q.close?.[i]
      if (c == null) continue
      points.push({
        time: r.timestamp[i] + offset,
        price: round2(c),
        volume: Math.round((q.volume?.[i] || 0) / (isTW ? 1000 : 1))
      })
    }
    if (points.length < 5) return cached?.value || null

    const value = {
      date: new Date((r.timestamp[0] + offset) * 1000).toISOString().slice(0, 10),
      previousClose: r.meta?.previousClose ?? r.meta?.chartPreviousClose ?? null,
      points
    }
    await store.setItem(key, { at: Date.now(), value })
    return value
  } catch {
    return cached?.value || null
  }
}
