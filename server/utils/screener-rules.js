// 選股規則引擎：每個條件是一個 (ctx) => boolean 的純函式。
// ctx = { stock, candles, institutional, holders, bigPower }
// 目錄（label / category / hint）在 shared/utils/screener-catalog.js。
// sma / mean 由 shared/utils/indicators.js 自動匯入。

function last(arr) {
  return arr[arr.length - 1]
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

  big_holder_up: ({ holders }) => {
    if (!holders?.available) return false
    const rows = holders.rows
    return rows.length > 5 && last(rows).bigShares > rows[rows.length - 6].bigShares
  },

  big_power_turn_positive: ({ bigPower }) => {
    if (!bigPower?.available) return false
    const rows = bigPower.rows
    return rows.length >= 2 && last(rows).power > 0 && rows[rows.length - 2].power <= 0
  }
}
