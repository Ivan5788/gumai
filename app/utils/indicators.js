// 技術指標（畫面用）。sma / mean 已在 shared/utils/indicators.js 自動匯入。

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
