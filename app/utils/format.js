// 數字格式化工具（台灣慣用）。自動匯入。

const DASH = '—'

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

// 千分位整數 / 一般數字
export function formatNumber(value) {
  const n = toNumber(value)
  return n === null ? DASH : n.toLocaleString('zh-TW')
}

// 價格，固定小數位
export function formatPrice(value, digits = 2) {
  const n = toNumber(value)
  return n === null
    ? DASH
    : n.toLocaleString('zh-TW', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      })
}

// 帶正負號的數值（漲跌）
export function formatSigned(value, digits = 2) {
  const n = toNumber(value)
  if (n === null) return DASH
  const sign = n > 0 ? '+' : ''
  return sign + formatPrice(n, digits)
}

// 帶正負號的百分比（漲跌幅）
export function formatPercent(value, digits = 2) {
  const n = toNumber(value)
  if (n === null) return DASH
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(digits)}%`
}

// 依漲跌回傳趨勢字串：台灣慣例為紅漲綠跌
export function trendOf(change) {
  const n = toNumber(change)
  if (n === null || n === 0) return 'flat'
  return n > 0 ? 'up' : 'down'
}
