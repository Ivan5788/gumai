// Mock 三大法人買賣超與大戶／散戶持股分布。
// 三大法人與集保股權分散為台股專屬資料；美股回傳 available: false。
// 未來由 Spring Boot 對接證交所 / 集保 / 資料商後即可移除。

import { makeRng, round, tradingDates } from './mock-history'

// 三大法人：外資、投信、自營商的每日買賣超（單位：張），近 tradingDays 日。
export function buildMockInstitutional(stock, { tradingDaysCount = 20 } = {}) {
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
  const dates = tradingDates(tradingDaysCount, 1, true)
  const scale = 1 + (makeRng(stock.symbol)() * 8) // 不同股票量能差異

  const days = dates.map((date) => {
    const foreign = Math.round((rng() - 0.48) * 9000 * scale)
    const trust = Math.round((rng() - 0.5) * 1500 * scale)
    const dealer = Math.round((rng() - 0.5) * 900 * scale)
    return { date, foreign, trust, dealer, total: foreign + trust + dealer }
  })

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

  return {
    symbol: stock.symbol,
    market: stock.market,
    available: true,
    unit: '張',
    days,
    summary: {
      d1: makeSummary(1),
      d5: makeSummary(5),
      d20: makeSummary(20)
    },
    isMock: true
  }
}

// 大戶／散戶持股分布（模擬集保戶股權分散表）。
export function buildMockHolders(stock) {
  if (stock.market !== 'TW') {
    return {
      symbol: stock.symbol,
      market: stock.market,
      available: false,
      reason: '集保戶股權分散為台股資料，美股請參考機構持股（13F）等資訊。',
      isMock: true
    }
  }

  const rng = makeRng(`${stock.symbol}:holders`)
  const asOf = tradingDates(6, 5, true)[0] // 約一週前的週五

  // 級距（持股張數）：占比由小到大遞增，最後正規化為 100%
  const bandDefs = [
    { label: '1–5 張', weight: 3 + rng() * 4 },
    { label: '6–10 張', weight: 2 + rng() * 3 },
    { label: '11–50 張', weight: 4 + rng() * 5 },
    { label: '51–100 張', weight: 3 + rng() * 4 },
    { label: '101–400 張', weight: 5 + rng() * 6 },
    { label: '401–1,000 張', weight: 6 + rng() * 8 },
    { label: '1,001 張以上', weight: 20 + rng() * 30 }
  ]

  const weightTotal = bandDefs.reduce((acc, b) => acc + b.weight, 0)
  const bands = bandDefs.map((b) => {
    const percent = round((b.weight / weightTotal) * 100, 2)
    return {
      label: b.label,
      percent,
      holders: Math.max(1, Math.round((b.weight / weightTotal) * (8000 + rng() * 40000)))
    }
  })

  // 大戶 = 400 張以上，散戶 = 400 張以下
  const bigPercent = round(
    bands.slice(-2).reduce((acc, b) => acc + b.percent, 0),
    2
  )
  const retailPercent = round(100 - bigPercent, 2)

  return {
    symbol: stock.symbol,
    market: stock.market,
    available: true,
    asOf,
    threshold: '400 張',
    concentration: { bigPercent, retailPercent },
    bands,
    isMock: true
  }
}
