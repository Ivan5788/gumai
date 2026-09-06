// 技術指標計算。自動匯入。

// 簡單移動平均（MA / SMA）。回傳與輸入等長的陣列，前 period-1 筆為 null。
export function sma(values, period) {
  const out = []
  let sum = 0
  for (let i = 0; i < values.length; i += 1) {
    const v = Number(values[i]) || 0
    sum += v
    if (i >= period) sum -= Number(values[i - period]) || 0
    out.push(i >= period - 1 ? sum / period : null)
  }
  return out
}

// 由 K 線陣列產生某條 MA 的 { time, value } 序列（跳過 null）。
export function maLine(candles, period) {
  const closes = candles.map((c) => c.close)
  const avg = sma(closes, period)
  const line = []
  for (let i = 0; i < candles.length; i += 1) {
    if (avg[i] !== null) {
      line.push({ time: candles[i].time, value: Math.round(avg[i] * 100) / 100 })
    }
  }
  return line
}

// 常用均線週期與顏色（看盤慣用）
export const MA_PRESETS = [
  { period: 5, label: 'MA5', color: '#f2c94c' },
  { period: 20, label: 'MA20', color: '#5aa7ff' },
  { period: 60, label: 'MA60', color: '#bb6bd9' }
]
