// Mock 三大法人買賣超與大戶／散戶持股分布。
// 三大法人與集保股權分散為台股專屬資料；美股回傳 available: false。
// 未來由 Spring Boot 對接證交所 / 集保 / 資料商後即可移除。

import { makeRng, tradingDates } from './mock-history'

function mondayOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().slice(0, 10)
}

function aggregateWeekly(days) {
  const map = new Map()
  for (const d of days) {
    const key = mondayOf(d.date)
    const acc = map.get(key) || { date: key, foreign: 0, trust: 0, dealer: 0, total: 0 }
    acc.foreign += d.foreign
    acc.trust += d.trust
    acc.dealer += d.dealer
    acc.total += d.total
    map.set(key, acc)
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date))
}

// 由每日買賣超陣列組出端點回應（rows 依 interval、summary 用每日）。
// days: [{ date, foreign, trust, dealer, total }]，日期升冪。
export function assembleInstitutional(stock, days, { interval = '1d', source = 'mock' } = {}) {
  const sumOf = (list, key) => list.reduce((acc, d) => acc + d[key], 0)
  const makeSummary = (n) => {
    const slice = days.slice(-n)
    return {
      range: n,
      foreign: sumOf(slice, 'foreign'),
      trust: sumOf(slice, 'trust'),
      dealer: sumOf(slice, 'dealer'),
      total: sumOf(slice, 'total')
    }
  }

  const normalizedInterval = interval === '1wk' ? '1wk' : '1d'

  return {
    symbol: stock.symbol,
    market: stock.market,
    available: true,
    unit: '張',
    interval: normalizedInterval,
    source,
    rows: normalizedInterval === '1wk' ? aggregateWeekly(days) : days,
    summary: {
      d1: makeSummary(1),
      d5: makeSummary(5),
      d20: makeSummary(20)
    },
    isMock: source === 'mock'
  }
}

// 三大法人：外資、投信、自營商的買賣超（單位：張）。示範資料。
export function buildMockInstitutional(stock, { interval = '1d' } = {}) {
  if (stock.market !== 'TW') {
    return {
      symbol: stock.symbol,
      market: stock.market,
      available: false,
      reason: '三大法人買賣超為台股資料，美股不適用。',
      isMock: true
    }
  }

  const rng = makeRng(`${stock.symbol}:institutional`)
  const dates = tradingDates(60, 1, true)
  const scale = 1 + makeRng(stock.symbol)() * 8

  const days = dates.map((date) => {
    const foreign = Math.round((rng() - 0.48) * 9000 * scale)
    const trust = Math.round((rng() - 0.5) * 1500 * scale)
    const dealer = Math.round((rng() - 0.5) * 900 * scale)
    return { date, foreign, trust, dealer, total: foreign + trust + dealer }
  })

  return assembleInstitutional(stock, days, { interval, source: 'mock' })
}

// 由週點序列組出大戶／散戶端點回應。
// points: [{ date, bigShares, retailShares, bigPercent?, retailPercent? }]（升冪）
export function assembleHolders(stock, points, source = 'mock') {
  const rows = points.map((p, i) => {
    const prev = points[i - 1]
    return {
      date: p.date,
      bigShares: p.bigShares,
      bigNet: prev ? p.bigShares - prev.bigShares : 0,
      retailShares: p.retailShares,
      retailNet: prev ? p.retailShares - prev.retailShares : 0
    }
  })
  const last = points[points.length - 1] || {}

  return {
    symbol: stock.symbol,
    market: stock.market,
    available: true,
    unit: '張',
    interval: 'weekly',
    source,
    thresholds: { big: '1,000 張以上', retail: '100 張以下' },
    rows,
    latest: {
      bigShares: last.bigShares ?? null,
      retailShares: last.retailShares ?? null,
      bigPercent: last.bigPercent ?? null,
      retailPercent: last.retailPercent ?? null,
      date: last.date ?? null
    },
    isMock: source === 'mock'
  }
}

// 大戶／散戶持股 —— 示範資料（每週點，模擬集保週資料）。
export function buildMockHolders(stock) {
  if (stock.market !== 'TW') {
    return {
      symbol: stock.symbol,
      market: stock.market,
      available: false,
      reason: '大戶／散戶持股為台股（集保）資料，美股請參考機構持股（13F）等資訊。',
      isMock: true
    }
  }

  const rng = makeRng(`${stock.symbol}:holders`)
  const scale = 0.5 + makeRng(`${stock.symbol}:hf`)() * 4
  const weeks = tradingDates(16, 7, false)

  let big = Math.round(7_000_000 * scale)
  let retail = Math.round(2_200_000 * scale)
  const total = big / 0.55

  const points = weeks.map((date) => {
    const bigNet = Math.round((rng() - 0.47) * 12000 * scale)
    const retailNet = Math.round(-bigNet * (0.4 + rng() * 0.5) + (rng() - 0.5) * 4000 * scale)
    big = Math.max(1, big + bigNet)
    retail = Math.max(1, retail + retailNet)
    return {
      date,
      bigShares: big,
      retailShares: retail,
      bigPercent: round2((big / total) * 100),
      retailPercent: round2((retail / total) * 100)
    }
  })

  return assembleHolders(stock, points, 'mock')
}

function round2(v) {
  return Math.round(v * 100) / 100
}
