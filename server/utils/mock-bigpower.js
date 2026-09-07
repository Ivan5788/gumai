// Mock「大戶買賣力」。
// 大戶買賣力 =（特大單 + 大單）×（外盤成交量 − 內盤成交量）
//
// 真實資料需要逐筆成交明細（依單量分級距）與內外盤分類，
// 免費公開資料沒有；未來接券商 API（永豐 Shioaji、富果等）後即可移除。

import { makeRng, tradingDates, sessionHourlyTimes } from './mock-history'

function mondayOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day))
  return d.toISOString().slice(0, 10)
}

function periodKeys(interval, market) {
  if (interval === '60m') return sessionHourlyTimes(60, market)
  if (interval === '1wk') {
    // 由每日交易日彙整出不重複的週一
    const seen = new Set()
    const weeks = []
    for (const d of tradingDates(112, 1, true)) {
      const k = mondayOf(d)
      if (!seen.has(k)) {
        seen.add(k)
        weeks.push(k)
      }
    }
    return weeks
  }
  return tradingDates(40, 1, true)
}

// interval: '1d' | '1wk' | '60m'
export function buildMockBigPower(stock, { interval = '1d' } = {}) {
  if (stock.market !== 'TW') {
    return {
      symbol: stock.symbol,
      market: stock.market,
      available: false,
      reason: '大戶買賣力需台股逐筆成交與內外盤資料，美股不適用。',
      isMock: true
    }
  }

  const normalizedInterval = ['1d', '1wk', '60m'].includes(interval) ? interval : '1d'
  const rng = makeRng(`${stock.symbol}:bigpower:${normalizedInterval}`)
  const scale = 0.6 + makeRng(`${stock.symbol}:bpf`)() * 3
  const factor = normalizedInterval === '60m' ? 0.35 : normalizedInterval === '1wk' ? 4 : 1

  const keys = periodKeys(normalizedInterval, stock.market)
  const baseLots = (stock.market === 'TW' ? 12000 : 4_000_000) * scale * factor

  const rows = keys.map((time) => {
    const xlOrders = Math.round(rng() * 260 * scale * factor) // 特大單筆數
    const largeOrders = Math.round(rng() * 720 * scale * factor) // 大單筆數
    const outerVolume = Math.round((0.45 + rng()) * baseLots) // 外盤成交量（張）
    const innerVolume = Math.round((0.45 + rng()) * baseLots) // 內盤成交量（張）
    // 依公式，除以 1000 讓數值較好讀（單位：千）
    const power = Math.round(((xlOrders + largeOrders) * (outerVolume - innerVolume)) / 1000)
    return { time, xlOrders, largeOrders, outerVolume, innerVolume, power }
  })

  return {
    symbol: stock.symbol,
    market: stock.market,
    available: true,
    interval: normalizedInterval,
    unit: '千',
    formula: '大戶買賣力 =（特大單 + 大單）×（外盤 − 內盤）',
    rows,
    isMock: true
  }
}
