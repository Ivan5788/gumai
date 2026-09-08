// 關鍵訊號掃描：偵測近期「剛發生」的訊號事件（狀態轉折），與選股的「目前成立」不同。
// sma / mean 由 shared/utils/indicators.js 自動匯入。

// ctx = { stock, candles, institutional, bigPower }
// 回傳 [{ date, signalId }]，date 為 'YYYY-MM-DD'
export function scanSignals({ candles, institutional, bigPower }, lookback = 10) {
  const events = []
  if (!candles || candles.length < 3) return events

  const closes = candles.map((c) => c.close)
  const vols = candles.map((c) => c.volume)
  const ma5 = sma(closes, 5)
  const ma20 = sma(closes, 20)
  const ma60 = sma(closes, 60)

  const start = Math.max(2, candles.length - lookback)
  for (let i = start; i < candles.length; i += 1) {
    const date = candles[i].time
    const add = (signalId) => events.push({ date, signalId })

    if (ma20[i - 1] != null) {
      if (closes[i - 1] <= ma20[i - 1] && closes[i] > ma20[i]) add('cross_above_ma20')
      if (closes[i - 1] >= ma20[i - 1] && closes[i] < ma20[i]) add('break_below_ma20')
    }
    if (ma60[i - 1] != null) {
      if (closes[i - 1] <= ma60[i - 1] && closes[i] > ma60[i]) add('cross_above_ma60')
    }
    if (ma5[i - 1] != null && ma20[i - 1] != null) {
      if (ma5[i - 1] <= ma20[i - 1] && ma5[i] > ma20[i]) add('golden_cross')
      if (ma5[i - 1] >= ma20[i - 1] && ma5[i] < ma20[i]) add('dead_cross')
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
