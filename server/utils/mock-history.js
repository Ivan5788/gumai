// Mock 歷史 K 線與當日走勢資料產生器。
// 依股票代號決定亂數種子，讓同一檔股票每次結果一致（利於 SSR / 快取）。
// 未來改由 Spring Boot 提供真實資料後即可移除。

export function makeRng(seedStr) {
  let seed = 0
  for (let i = 0; i < seedStr.length; i += 1) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) | 0
  }
  seed = Math.abs(seed) || 1
  // mulberry32
  return function next() {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function round(value, digits = 2) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function ymd(date) {
  return date.toISOString().slice(0, 10)
}

// 產生交易日日期序列（由最近的交易日往回推 count 個），日 K 跳過週末。
export function tradingDates(count, stepDays, weekdaysOnly) {
  const dates = []
  const cursor = new Date()
  cursor.setUTCHours(0, 0, 0, 0)

  while (dates.length < count) {
    const day = cursor.getUTCDay()
    if (!weekdaysOnly || (day !== 0 && day !== 6)) {
      dates.push(ymd(cursor))
    }
    cursor.setUTCDate(cursor.getUTCDate() - (weekdaysOnly ? 1 : stepDays))
  }

  return dates.reverse()
}

// 產生某市場交易時段內的整點時間戳（unix 秒），往回取 count 個，跳過週末。
function sessionHourlyTimes(count, market) {
  const timezone = (MARKETS[market] || MARKETS.TW).timezone
  const session = MARKET_SESSIONS[market] || MARKET_SESSIONS.TW
  const openHour = Number(session.open.split(':')[0])
  const closeHour = Number(session.close.split(':')[0])

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    hour12: false
  })

  const times = []
  const cursor = new Date()
  cursor.setMinutes(0, 0, 0)

  let guard = 0
  while (times.length < count && guard < count * 12 + 800) {
    guard += 1
    const parts = fmt.formatToParts(cursor)
    const weekday = parts.find((p) => p.type === 'weekday').value
    const hour = Number(parts.find((p) => p.type === 'hour').value) % 24
    if (weekday !== 'Sat' && weekday !== 'Sun' && hour >= openHour && hour <= closeHour) {
      times.push(Math.floor(cursor.getTime() / 1000))
    }
    cursor.setHours(cursor.getHours() - 1)
  }

  return times.reverse()
}

// 產生 K 線。interval: '1d' | '1wk' | '60m'
export function buildMockCandles(stock, { interval = '1d', limit } = {}) {
  const isWeekly = interval === '1wk'
  const isHourly = interval === '60m'
  const rng = makeRng(`${stock.symbol}:${interval}`)

  const defaultLimit = isWeekly ? 80 : 120
  const count = Math.min(Math.max(Number(limit) || defaultLimit, 20), 600)

  const times = isHourly
    ? sessionHourlyTimes(count, stock.market)
    : tradingDates(count, isWeekly ? 7 : 1, !isWeekly)

  const volatility = isHourly ? 0.012 : 0.035
  const wickFactor = isHourly ? 0.01 : 0.02
  const volBase = stock.market === 'TW'
    ? (isHourly ? 5000 : 20000)
    : (isHourly ? 2000000 : 8000000)

  // 由第一根往後走，最後一根收在 previousClose
  const candles = []
  let close = stock.previousClose * (0.82 + rng() * 0.12)

  for (let i = 0; i < times.length; i += 1) {
    const drift = (rng() - 0.47) * volatility
    const open = close
    close = Math.max(1, open * (1 + drift))
    const high = Math.max(open, close) * (1 + rng() * wickFactor)
    const low = Math.min(open, close) * (1 - rng() * wickFactor)
    const volume = Math.round((0.6 + rng() * 1.8) * volBase)

    candles.push({
      time: times[i],
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume
    })
  }

  const last = candles[candles.length - 1]
  if (last && isHourly) {
    // 60 分 K：整條等比縮放，讓最後收盤 ≈ previousClose，避免結尾突刺
    const ratio = stock.previousClose / last.close
    candles.forEach((c) => {
      c.open = round(c.open * ratio)
      c.high = round(c.high * ratio)
      c.low = round(c.low * ratio)
      c.close = round(c.close * ratio)
    })
  } else if (last) {
    // 日 / 週 K：收斂最後一根到 previousClose，讓與報價一致
    last.close = stock.previousClose
    last.high = round(Math.max(last.high, last.close))
    last.low = round(Math.min(last.low, last.close))
    last.open = round(Math.min(Math.max(last.open, last.low), last.high))
  }

  return candles
}

// 產生當日分時走勢。台股 09:00–13:30、美股 09:30–16:00。
// 盤中只輸出到「現在」為止的點，讓連續輪詢看得到走勢延伸；
// 開盤前輸出整段（視為前一場），收盤後輸出完整當日。
export function buildMockIntraday(stock) {
  const isTW = stock.market === 'TW'
  const now = new Date()
  const rng = makeRng(`${stock.symbol}:intraday:${ymd(now)}`)

  const start = new Date(now)
  start.setUTCHours(0, 0, 0, 0)
  // 概略 UTC 開盤時間：台股 09:00(+8) → 01:00 UTC；美股 09:30(EDT -4) → 13:30 UTC
  const startMinutes = isTW ? 60 : 810
  const sessionMinutes = isTW ? 270 : 390
  const stepMinutes = 5

  const elapsed = now.getUTCHours() * 60 + now.getUTCMinutes() - startMinutes
  const cap = elapsed <= 0 ? sessionMinutes : Math.min(elapsed, sessionMinutes)

  const points = []
  let price = stock.previousClose * (1 + (rng() - 0.5) * 0.008)

  for (let m = 0; m <= cap; m += stepMinutes) {
    const t = new Date(start)
    t.setUTCMinutes(startMinutes + m)
    price = Math.max(0.01, price * (1 + (rng() - 0.5) * 0.0035))
    points.push({
      time: Math.floor(t.getTime() / 1000),
      price: round(price),
      volume: Math.round((0.4 + rng()) * (isTW ? 900 : 220000))
    })
  }

  return {
    date: ymd(now),
    previousClose: stock.previousClose,
    marketOpen: elapsed > 0 && elapsed < sessionMinutes,
    points
  }
}
