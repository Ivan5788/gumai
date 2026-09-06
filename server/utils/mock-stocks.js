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

// 由 previousClose 產生一組穩定（依代號決定）的假報價，
// 讓 SSR 與 hydration 結果一致、也利於 SWR 快取。
// 真實即時報價之後會由後端提供，並在瀏覽器端更新。
export function buildMockQuote(stock) {
  const seed = hashString(stock.symbol)
  const drift = ((seed % 1000) / 1000 - 0.5) * 0.06 // 約 -3% ~ +3%
  const price = round(stock.previousClose * (1 + drift))
  const change = round(price - stock.previousClose)
  const changePercent = round((change / stock.previousClose) * 100)

  return {
    price,
    change,
    changePercent,
    open: round(stock.previousClose * (1 + drift * 0.3)),
    high: round(Math.max(price, stock.previousClose) * 1.01),
    low: round(Math.min(price, stock.previousClose) * 0.99),
    previousClose: stock.previousClose,
    volume: 1000 + (seed % 90000), // 成交量（張 / 股）
    updatedAt: new Date().toISOString(),
    isMock: true
  }
}
