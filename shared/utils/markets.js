// 市場定義與股票代號工具。放在 shared/ 讓 app 與 server（Nitro）都能自動匯入。

export const MARKETS = {
  TW: {
    code: 'TW',
    label: '台股',
    fullLabel: '台灣股市',
    currency: 'TWD',
    currencySymbol: 'NT$',
    timezone: 'Asia/Taipei',
    // 台股代號：4~6 位數字，少數含一位英文（權證、特別股等）
    symbolPattern: /^[0-9]{4,6}[A-Z]?$/
  },
  US: {
    code: 'US',
    label: '美股',
    fullLabel: '美國股市',
    currency: 'USD',
    currencySymbol: '$',
    timezone: 'America/New_York',
    // 美股代號：1~5 位英文字母，少數含 . 或 - 後綴（如 BRK.B）
    symbolPattern: /^[A-Z]{1,5}([.-][A-Z]{1,2})?$/
  }
}

export const MARKET_CODES = Object.keys(MARKETS)

export const DEFAULT_MARKET = 'TW'

// 正規化使用者輸入的股票代號
export function normalizeSymbol(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

// 依代號格式推測所屬市場：純數字 → 台股，英文字母 → 美股，無法判斷 → null
export function detectMarket(symbol) {
  const s = normalizeSymbol(symbol)
  if (MARKETS.TW.symbolPattern.test(s)) return 'TW'
  if (MARKETS.US.symbolPattern.test(s)) return 'US'
  return null
}

export function isValidSymbol(symbol) {
  return detectMarket(symbol) !== null
}

export function getMarket(code) {
  return MARKETS[code] || null
}
