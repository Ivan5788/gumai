// 技術指標計算（app 與 server 共用，自動匯入）。

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

// 陣列平均
export function mean(values) {
  if (!values.length) return 0
  return values.reduce((acc, v) => acc + (Number(v) || 0), 0) / values.length
}
