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

// 各市場的正常交易時段（當地時間，24 小時制）
export const MARKET_SESSIONS = {
  TW: { open: '09:00', close: '13:30' },
  US: { open: '09:30', close: '16:00' }
}

// 取得某時區的當地星期與分鐘數（00:00 起算）
function localWallClock(timezone, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date)

  const get = (type) => parts.find((p) => p.type === type)?.value
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const hour = Number(get('hour')) % 24
  const minute = Number(get('minute'))
  return { weekday: weekdayMap[get('weekday')], minutes: hour * 60 + minute }
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

// 市場目前是否為交易時段（不含國定假日，僅供 mock / 顯示用）
export function isMarketOpen(code, date = new Date()) {
  const market = MARKETS[code]
  const session = MARKET_SESSIONS[code]
  if (!market || !session) return false

  const { weekday, minutes } = localWallClock(market.timezone, date)
  if (weekday === 0 || weekday === 6) return false
  return minutes >= toMinutes(session.open) && minutes < toMinutes(session.close)
}

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
