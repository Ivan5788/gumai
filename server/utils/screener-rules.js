// 選股規則引擎：每個條件是一個 (ctx) => boolean 的純函式。
// ctx = { stock, candles, institutional, holders, bigPower }
// 目錄（label / category / hint）在 shared/utils/screener-catalog.js。
// sma / mean 由 shared/utils/indicators.js 自動匯入。

function last(arr) {
  return arr[arr.length - 1]
}

// 回測均線：近 lookback 個交易日內（不含最新一日），收盤跌破該均線、或最低價
// 逼近該均線（在均線之上 0.3% 以內），且目前（最新收盤）已經站回均線之上（含）。
function retestMa(candles, period, lookback = 10) {
  if (candles.length < period + 2) return false
  const closes = candles.map((c) => c.close)
  const lows = candles.map((c) => c.low)
  const ma = sma(closes, period)
  const n = candles.length

  const nowMa = ma[n - 1]
  if (nowMa == null || closes[n - 1] < nowMa) return false

  const start = Math.max(period - 1, n - 1 - lookback)
  for (let i = start; i < n - 1; i += 1) {
    if (ma[i] == null) continue
    if (closes[i] < ma[i] || lows[i] <= ma[i] * 1.003) return true
  }
  return false
}

export const RULE_TESTS = {
  above_ma20: ({ candles }) => {
    const closes = candles.map((c) => c.close)
    const ma = sma(closes, 20)
    return last(ma) != null && last(closes) > last(ma)
  },

  above_ma60: ({ candles }) => {
    const closes = candles.map((c) => c.close)
    const ma = sma(closes, 60)
    return last(ma) != null && last(closes) > last(ma)
  },

  // 收盤價同時站上 5 / 10 / 20 日均線（短期多頭排列）
  above_short_mas: ({ candles }) => {
    const closes = candles.map((c) => c.close)
    const ma5 = sma(closes, 5)
    const ma10 = sma(closes, 10)
    const ma20 = sma(closes, 20)
    if (last(ma5) == null || last(ma10) == null || last(ma20) == null) return false
    const c = last(closes)
    return c > last(ma5) && c > last(ma10) && c > last(ma20)
  },

  // 回測：近期收盤跌破、或最低價逼近過該均線，且目前收盤已站回均線之上（含）
  retest_ma10: ({ candles }) => retestMa(candles, 10),
  retest_ma20: ({ candles }) => retestMa(candles, 20),

  ma_golden_cross: ({ candles }) => {
    const closes = candles.map((c) => c.close)
    const ma5 = sma(closes, 5)
    const ma20 = sma(closes, 20)
    for (let i = Math.max(1, closes.length - 5); i < closes.length; i += 1) {
      if (
        ma5[i - 1] != null &&
        ma20[i - 1] != null &&
        ma5[i - 1] <= ma20[i - 1] &&
        ma5[i] > ma20[i]
      ) {
        return true
      }
    }
    return false
  },

  break_20d_high: ({ candles }) => {
    if (candles.length < 21) return false
    const prior = candles.slice(-21, -1)
    const hi = Math.max(...prior.map((c) => c.high))
    return last(candles).close >= hi
  },

  // 近 10 個交易日內出現爆量
  volume_surge: ({ candles }) => {
    if (candles.length < 16) return false
    const vols = candles.map((c) => c.volume)
    for (let i = candles.length - 10; i < candles.length; i += 1) {
      const avg = mean(vols.slice(i - 5, i))
      if (avg > 0 && vols[i] >= avg * 2) return true
    }
    return false
  },

  // 近 10 個交易日內出現跳空上漲
  gap_up: ({ candles }) => {
    if (candles.length < 11) return false
    for (let i = candles.length - 10; i < candles.length; i += 1) {
      if (candles[i].open > candles[i - 1].high && candles[i].close > candles[i].open) return true
    }
    return false
  },

  up_streak_3: ({ candles }) => {
    if (candles.length < 4) return false
    const c = candles.slice(-4).map((x) => x.close)
    return c[1] > c[0] && c[2] > c[1] && c[3] > c[2]
  },

  foreign_buy_streak: ({ institutional }) => {
    if (!institutional?.available) return false
    const rows = institutional.rows.slice(-3)
    return rows.length === 3 && rows.every((r) => r.foreign > 0)
  },

  trust_buy: ({ institutional }) => {
    if (!institutional?.available) return false
    return last(institutional.rows)?.trust > 0
  },

  // 散戶（≤100 張）持股較約一個月前（4 週）結算減少，籌碼趨於集中。
  // 集保資料不足 5 週時，與最早一筆比較；需 ≥2 週。
  retail_holder_down: ({ holders }) => {
    if (!holders?.available) return false
    const rows = holders.rows
    if (rows.length < 2) return false
    const ref = rows[Math.max(0, rows.length - 5)]
    return last(rows).retailShares < ref.retailShares
  },

  big_power_turn_positive: ({ bigPower }) => {
    if (!bigPower?.available) return false
    const rows = bigPower.rows
    return rows.length >= 2 && last(rows).power > 0 && rows[rows.length - 2].power <= 0
  }
}
