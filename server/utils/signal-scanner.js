// 關鍵訊號掃描：偵測近期「剛發生」的訊號事件（狀態轉折），與選股的「目前成立」不同。
// sma / mean 由 shared/utils/indicators.js 自動匯入。

// ctx = { stock, candles, institutional, bigPower }
// 回傳 [{ date, signalId }]，date 為 'YYYY-MM-DD'
export function scanSignals({ candles, institutional, bigPower }, lookback = 10) {
  const events = []
  if (!candles || candles.length < 3) return events

  const closes = candles.map((c) => c.close)
  const lows = candles.map((c) => c.low)
  const vols = candles.map((c) => c.volume)
  const ma5 = sma(closes, 5)
  const ma10 = sma(closes, 10)
  const ma20 = sma(closes, 20)
  const ma60 = sma(closes, 60)
  const RETEST_TOUCH_WINDOW = 10

  const n = candles.length

  // 交叉是否「站穩」：交叉後下一根仍維持同方向（或本身已是最後一根，無從判斷則保留）
  const held = (a, b, i, dir) => {
    if (i >= n - 1) return true
    if (b[i + 1] == null) return true
    return dir > 0 ? a[i + 1] > b[i + 1] : a[i + 1] < b[i + 1]
  }

  // day i 之前 window 天內，是否曾經收盤跌破或最低價逼近過該均線（在均線之上 0.3% 以內）
  const touchedMaRecently = (ma, i, window) => {
    for (let j = Math.max(0, i - window); j < i; j += 1) {
      if (ma[j] == null) continue
      if (closes[j] < ma[j] || lows[j] <= ma[j] * 1.003) return true
    }
    return false
  }

  const start = Math.max(2, n - lookback)
  for (let i = start; i < n; i += 1) {
    const date = candles[i].time
    const add = (signalId) => events.push({ date, signalId })

    if (ma20[i - 1] != null) {
      if (closes[i - 1] <= ma20[i - 1] && closes[i] > ma20[i] && held(closes, ma20, i, 1)) {
        add('cross_above_ma20')
      }
      if (closes[i - 1] >= ma20[i - 1] && closes[i] < ma20[i] && held(closes, ma20, i, -1)) {
        add('break_below_ma20')
      }
    }
    if (ma60[i - 1] != null) {
      if (closes[i - 1] <= ma60[i - 1] && closes[i] > ma60[i] && held(closes, ma60, i, 1)) {
        add('cross_above_ma60')
      }
    }
    if (ma5[i - 1] != null && ma20[i - 1] != null) {
      if (ma5[i - 1] <= ma20[i - 1] && ma5[i] > ma20[i] && held(ma5, ma20, i, 1)) add('golden_cross')
      if (ma5[i - 1] >= ma20[i - 1] && ma5[i] < ma20[i] && held(ma5, ma20, i, -1)) add('dead_cross')
    }

    // 站上三短期均線（5/10/20）：今天同時滿足、昨天還沒全部滿足
    if (ma5[i] != null && ma10[i] != null && ma20[i] != null) {
      const alignedNow = closes[i] > ma5[i] && closes[i] > ma10[i] && closes[i] > ma20[i]
      const alignedPrev =
        ma5[i - 1] != null &&
        ma10[i - 1] != null &&
        ma20[i - 1] != null &&
        closes[i - 1] > ma5[i - 1] &&
        closes[i - 1] > ma10[i - 1] &&
        closes[i - 1] > ma20[i - 1]
      if (alignedNow && !alignedPrev) add('short_ma_alignment')
    }

    // 回測站回：跌破/逼近均線後站回，且交叉後站穩
    if (ma10[i - 1] != null) {
      if (
        closes[i - 1] <= ma10[i - 1] &&
        closes[i] > ma10[i] &&
        held(closes, ma10, i, 1) &&
        touchedMaRecently(ma10, i, RETEST_TOUCH_WINDOW)
      ) {
        add('retest_ma10_reclaim')
      }
    }
    if (ma20[i - 1] != null) {
      if (
        closes[i - 1] <= ma20[i - 1] &&
        closes[i] > ma20[i] &&
        held(closes, ma20, i, 1) &&
        touchedMaRecently(ma20, i, RETEST_TOUCH_WINDOW)
      ) {
        add('retest_ma20_reclaim')
      }
    }

    if (i >= 21) {
      const priorHigh = Math.max(...candles.slice(i - 20, i).map((c) => c.high))
      if (candles[i].close >= priorHigh) add('new_20d_high')
    }

    const avgVol = mean(vols.slice(Math.max(0, i - 5), i))
    if (avgVol > 0 && vols[i] >= avgVol * 2) {
      add(candles[i].close >= candles[i].open ? 'volume_spike_up' : 'volume_spike_down')
    }

    if (candles[i].open > candles[i - 1].high && candles[i].close > candles[i].open) add('gap_up')
    if (candles[i].open < candles[i - 1].low && candles[i].close < candles[i].open) add('gap_down')
  }

  // 籌碼轉折：要求前兩期同方向、本期反轉，避免每日噪音誤判
  const turned = (rows, i, key, dir) => {
    if (i < 2) return false
    const a = rows[i - 2][key]
    const b = rows[i - 1][key]
    const c = rows[i][key]
    return dir > 0 ? a <= 0 && b <= 0 && c > 0 : a >= 0 && b >= 0 && c < 0
  }

  if (institutional?.available) {
    const rows = institutional.rows
    for (let i = Math.max(2, rows.length - lookback); i < rows.length; i += 1) {
      if (turned(rows, i, 'foreign', 1)) events.push({ date: rows[i].date, signalId: 'foreign_turn_buy' })
      if (turned(rows, i, 'foreign', -1)) events.push({ date: rows[i].date, signalId: 'foreign_turn_sell' })
    }
  }

  if (bigPower?.available) {
    const rows = bigPower.rows
    for (let i = Math.max(2, rows.length - lookback); i < rows.length; i += 1) {
      if (turned(rows, i, 'power', 1)) events.push({ date: rows[i].time, signalId: 'big_power_positive' })
      if (turned(rows, i, 'power', -1)) events.push({ date: rows[i].time, signalId: 'big_power_negative' })
    }
  }

  return events
}
