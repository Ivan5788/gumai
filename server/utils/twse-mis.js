// 證交所「盤中即時資訊」（MIS）—— 官方免費，公開用戶延遲約 5 秒（回應內
// userDelay 欄位標示），涵蓋上市（tse_ 前綴）與上櫃（otc_ 前綴），也包含大盤指數
// （tse_t00.tw 加權、otc_o00.tw 櫃買）。支援一次查多檔（ex_ch 用 | 分隔）。
//
// 這個來源在本環境過去測過不穩定（曾連線失敗），所以只當「優先嘗試」使用：
// 呼叫端一律要包 try/catch，失敗就落回既有的 Yahoo 延遲報價 / 證交所盤後批次資料，
// 不能讓這個來源的不穩定影響到已經可靠運作的既有機制。

const BASE = 'https://mis.twse.com.tw/stock/api/getStockInfo.jsp'
const UA = 'Mozilla/5.0 (GuMai)'
const REFERER = 'https://mis.twse.com.tw/stock/index.jsp'
const CACHE_TTL = 5000 // 跟官方 userDelay 同級，更頻繁地打也拿不到更新的值

const memo = new Map() // ex_ch 組合字串 -> { at, rows: Map(code -> row) }

function num(v) {
  if (v == null || v === '-') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function round2(v) {
  return v == null ? null : Math.round(v * 100) / 100
}

// 台股代號（上市/上櫃）用；指數請直接傳 'tse_t00.tw' / 'otc_o00.tw'
export function misExCh(stock) {
  if (stock.market !== 'TW') return null
  return stock.listing === 'TPEx' ? `otc_${stock.symbol}.tw` : `tse_${stock.symbol}.tw`
}

function parseRow(m) {
  // 成交價優先用巢狀 trade.z（最近一筆成交）；頂層 z 常是 "-"（尚未有新的一筆）
  const price = num(m.trade?.z) ?? num(m.z)
  const prevClose = num(m.y)
  if (price == null || prevClose == null) return null

  const change = round2(price - prevClose)
  return {
    price: round2(price),
    previousClose: round2(prevClose),
    open: round2(num(m.o)),
    high: round2(num(m.h)),
    low: round2(num(m.l)),
    volume: num(m.v), // 張
    change,
    changePercent: prevClose ? round2((change / prevClose) * 100) : 0,
    date: m.d || null, // YYYYMMDD
    time: m.trade?.t || m.t || null // HH:MM:SS
  }
}

async function fetchBatch(exChList) {
  const key = exChList.join('|')
  const cached = memo.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.rows

  const url = `${BASE}?ex_ch=${encodeURIComponent(key)}&json=1&delay=0&_=${Date.now()}`
  const res = await $fetch(url, {
    headers: { 'User-Agent': UA, Referer: REFERER },
    timeout: 8000,
    retry: 0,
    // MIS 回應前面常帶一串換行/空白，content-type 也不一定標成 json，
    // 自己接手解析，不要靠 ofetch 自動偵測（偵測失敗會整包當純文字回傳）。
    parseResponse: (txt) => JSON.parse(txt.trim())
  })
  if (!res || res.rtcode !== '0000' || !Array.isArray(res.msgArray)) {
    throw new Error(`twse-mis: ${res?.rtmessage || 'bad response'}`)
  }

  const rows = new Map()
  for (const m of res.msgArray) {
    const row = parseRow(m)
    if (row) rows.set(m.c, row)
  }
  memo.set(key, { at: Date.now(), rows })
  return rows
}

// 單一標的（個股或指數）。exCh 例如 'tse_2330.tw'、'otc_1815.tw'、'tse_t00.tw'。
// 失敗或查無資料回 null，呼叫端負責落回既有來源。
export async function getMisQuote(exCh) {
  if (!exCh) return null
  const rows = await fetchBatch([exCh])
  const code = exCh.split('_')[1]?.replace(/\.tw$/, '')
  return rows.get(code) || null
}

// 批次（股票池等）。stocks: [{symbol, market, listing}]，非台股會被忽略。
// 回傳 Map(symbol -> row)，查不到的檔就沒有這個 key。
export async function getMisQuotesBatch(stocks) {
  const list = stocks.map((s) => ({ symbol: s.symbol, exCh: misExCh(s) })).filter((s) => s.exCh)
  if (!list.length) return new Map()
  const rows = await fetchBatch(list.map((s) => s.exCh))
  const out = new Map()
  for (const { symbol } of list) {
    if (rows.has(symbol)) out.set(symbol, rows.get(symbol))
  }
  return out
}
