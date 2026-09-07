// Mock 股票資料，供 server/api/** 使用。
// 未來改為呼叫 Spring Boot 後，這個檔案可移除，端點改為轉呼後端。

export const MOCK_STOCKS = [
  { symbol: '2330', market: 'TW', name: '台積電', nameEn: 'TSMC', industry: '半導體業', currency: 'TWD', previousClose: 1085 },
  { symbol: '2317', market: 'TW', name: '鴻海', nameEn: 'Hon Hai Precision', industry: '其他電子業', currency: 'TWD', previousClose: 202.5 },
  { symbol: '2454', market: 'TW', name: '聯發科', nameEn: 'MediaTek', industry: '半導體業', currency: 'TWD', previousClose: 1420 },
  { symbol: '2412', market: 'TW', name: '中華電', nameEn: 'Chunghwa Telecom', industry: '通信網路業', currency: 'TWD', previousClose: 128 },
  { symbol: '2308', market: 'TW', name: '台達電', nameEn: 'Delta Electronics', industry: '電子零組件業', currency: 'TWD', previousClose: 415 },
  { symbol: '0050', market: 'TW', name: '元大台灣50', nameEn: 'Yuanta Taiwan 50 ETF', industry: 'ETF', currency: 'TWD', previousClose: 190 },
  { symbol: 'AAPL', market: 'US', name: '蘋果', nameEn: 'Apple Inc.', industry: '消費性電子', currency: 'USD', previousClose: 232.5 },
  { symbol: 'NVDA', market: 'US', name: '輝達', nameEn: 'NVIDIA Corp.', industry: '半導體', currency: 'USD', previousClose: 178.2 },
  { symbol: 'MSFT', market: 'US', name: '微軟', nameEn: 'Microsoft Corp.', industry: '軟體服務', currency: 'USD', previousClose: 430.1 },
  { symbol: 'TSLA', market: 'US', name: '特斯拉', nameEn: 'Tesla Inc.', industry: '汽車', currency: 'USD', previousClose: 340.8 },
  { symbol: 'GOOGL', market: 'US', name: 'Alphabet', nameEn: 'Alphabet Inc.', industry: '網路服務', currency: 'USD', previousClose: 165.4 }
]

export function findMockStock(symbol) {
  const s = String(symbol || '').trim().toUpperCase()
  return MOCK_STOCKS.find((item) => item.symbol === s) || null
}

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function round(value, digits = 2) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function ymd(date) {
  return date.toISOString().slice(0, 10)
}

// 產生「會隨時間緩慢變動」的假報價。
// 以代號決定相位、以現在時間決定波形，讓連續輪詢看得到價格移動，
// 但同一秒內多次呼叫結果一致。真實即時報價之後由後端（WebSocket / API）提供。
export function buildLiveQuote(stock) {
  const seed = hashString(stock.symbol)
  const phase = (seed % 628) / 100
  const now = Date.now()
  const t = now / 1000

  const wave = Math.sin(t / 120 + phase) * 0.014
  const noise = (Math.sin(t / 5 + phase) + Math.sin(t / 2.1 + phase * 3)) * 0.0012
  const price = Math.max(0.01, round(stock.previousClose * (1 + wave + noise)))

  const openSeed = hashString(`${stock.symbol}:${ymd(new Date(now))}`)
  const open = round(stock.previousClose * (1 + ((openSeed % 200) / 10000 - 0.01)))

  const change = round(price - stock.previousClose)
  const changePercent = round((change / stock.previousClose) * 100)

  const envelope = stock.previousClose * 0.016
  const high = round(Math.max(price, open, stock.previousClose + Math.abs(Math.sin(phase)) * envelope))
  const low = round(Math.min(price, open, stock.previousClose - Math.abs(Math.cos(phase)) * envelope))

  // 成交量隨當日經過時間粗略累積
  const dayFraction = (now % 86400000) / 86400000
  const baseVolume = stock.market === 'TW' ? 60000 : 25000000
  const volume = Math.round(baseVolume * (0.15 + dayFraction) * (0.8 + (seed % 40) / 100))

  return {
    price,
    change,
    changePercent,
    open,
    high,
    low,
    previousClose: stock.previousClose,
    volume,
    marketOpen: isMarketOpen(stock.market, new Date(now)),
    updatedAt: new Date(now).toISOString(),
    isMock: true
  }
}
