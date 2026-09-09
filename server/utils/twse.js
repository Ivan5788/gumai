// 臺灣證券交易所（TWSE）上市股票日 K。
// 端點：STOCK_DAY，一次回傳「一個月」的每日成交資訊，需逐月抓取。
// 官方、免費、無金鑰；但有 rate limit，需節流 + 快取。
//
// 回傳 candle：{ time: 'YYYY-MM-DD', open, high, low, close, volume(張) }

const STOCK_DAY = 'https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY'
const CACHE_TTL_CURRENT = 30 * 60 * 1000 // 當月資料 30 分鐘

// 全域節流：串起所有對 TWSE 的請求，彼此間隔 ~1.2s
let queue = Promise.resolve()
function throttle(task) {
  const run = queue.then(task)
  queue = run.catch(() => {}).then(() => new Promise((r) => setTimeout(r, 1200)))
  return run
}

function rocToIso(roc) {
  const [y, m, d] = String(roc).split('/')
  return `${Number(y) + 1911}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function toNumber(s) {
  const n = Number(String(s).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}

async function fetchMonthRaw(stockNo, year, month) {
  const date = `${year}${String(month).padStart(2, '0')}01`
  const res = await $fetch(STOCK_DAY, {
    params: { date, stockNo, response: 'json' },
    headers: { 'User-Agent': 'Mozilla/5.0 (StockPulse)' },
    timeout: 12000,
    retry: 0
  })

  // 區分「該期間確實無資料」與「請求失敗 / 被限流」——後者不可快取為空
  if (!res || typeof res.stat !== 'string') throw new Error('twse: bad response')
  const noData = res.stat.includes('沒有符合條件')
  if (res.stat !== 'OK' && !noData) throw new Error(`twse: ${res.stat}`)
  if (noData || !Array.isArray(res.data)) return { rows: [], name: null }

  // title 例："115年09月 2330 台積電           各日成交資訊"
  const name = String(res.title || '').match(/\d+年\d+月\s+\S+\s+(\S+)\s+各日/)?.[1] || null

  const rows = res.data
    .map((row) => {
      // fields: 日期,成交股數,成交金額,開盤價,最高價,最低價,收盤價,漲跌價差,成交筆數,註記
      const open = toNumber(row[3])
      const high = toNumber(row[4])
      const low = toNumber(row[5])
      const close = toNumber(row[6])
      if (open === null || close === null || high === null || low === null) return null
      return {
        time: rocToIso(row[0]),
        open,
        high,
        low,
        close,
        volume: Math.round((toNumber(row[1]) || 0) / 1000) // 成交股數 → 張
      }
    })
    .filter(Boolean)

  return { rows, name }
}

async function getMonth(stockNo, year, month) {
  const now = new Date()
  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1
  const key = `twse:day:${stockNo}:${year}-${String(month).padStart(2, '0')}`
  const store = useStorage('data')

  const cached = await store.getItem(key)
  if (cached && (!isCurrent || Date.now() - cached.at < CACHE_TTL_CURRENT)) {
    return cached.rows
  }

  try {
    const { rows, name } = await throttle(() => fetchMonthRaw(stockNo, year, month))
    if (name) await store.setItem(`twse:name:${stockNo}`, name)
    // 過往月份即使空的也快取（該股當時未上市）；當月為空則不覆蓋既有快取
    if (rows.length || !isCurrent) {
      await store.setItem(key, { at: Date.now(), rows })
    }
    return rows.length ? rows : cached?.rows || []
  } catch {
    return cached?.rows || []
  }
}

export async function getTwseStockName(stockNo) {
  return (await useStorage('data').getItem(`twse:name:${stockNo}`)) || null
}

// 只讀該月快取，不發請求（用於背景漸進式補齊）
async function readCachedMonth(stockNo, year, month) {
  const key = `twse:day:${stockNo}:${year}-${String(month).padStart(2, '0')}`
  const cached = await useStorage('data').getItem(key)
  return cached?.rows || null
}

// 取得日 K，已排序去重。
//   monthsBack：同步抓取（await）的最近月份數
//   backgroundMonths：更早的月份 —— 已快取者併入本次結果，未快取者丟背景抓（不 await，
//     只為填快取，下次載入即完整）。避免冷門股首次載入等待整段區間。
export async function getTwseDailyCandles(stockNo, monthsBack = 8, { backgroundMonths = 0 } = {}) {
  const now = new Date()
  const out = new Map()

  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const rows = await getMonth(stockNo, d.getFullYear(), d.getMonth() + 1)
    for (const r of rows) out.set(r.time, r)
  }

  for (let i = monthsBack; i < monthsBack + backgroundMonths; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const cached = await readCachedMonth(stockNo, y, m)
    if (cached) {
      for (const r of cached) out.set(r.time, r)
    } else {
      // fire-and-forget：排入證交所節流佇列，填入快取供下次使用
      void getMonth(stockNo, y, m).catch(() => {})
    }
  }

  return [...out.values()].sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
}

// ── 上市公司清單（代號 → 名稱 / 產業）──────────────────
const INDUSTRY = {
  '01': '水泥工業', '02': '食品工業', '03': '塑膠工業', '04': '紡織纖維', '05': '電機機械',
  '06': '電器電纜', '08': '玻璃陶瓷', '09': '造紙工業', '10': '鋼鐵工業', '11': '橡膠工業',
  '12': '汽車工業', '14': '建材營造', '15': '航運業', '16': '觀光餐旅', '17': '金融保險',
  '18': '貿易百貨', '19': '綜合', '20': '其他業', '21': '化學工業', '22': '生技醫療業',
  '23': '油電燃氣業', '24': '半導體業', '25': '電腦及週邊設備業', '26': '光電業',
  '27': '通信網路業', '28': '電子零組件業', '29': '電子通路業', '30': '資訊服務業',
  '31': '其他電子業', '32': '文化創意業', '33': '農業科技業', '34': '電子商務',
  '35': '綠能環保', '36': '數位雲端', '37': '運動休閒', '38': '居家生活', '80': '管理股票'
}

export function twseIndustryLabel(code) {
  return INDUSTRY[String(code).padStart(2, '0')] || '上市'
}

let listedCache = null

export async function getTwseListedCompanies() {
  if (listedCache && Date.now() - listedCache.at < 24 * 60 * 60 * 1000) return listedCache.map

  const store = useStorage('data')
  const stored = await store.getItem('twse:listed')
  if (stored && Date.now() - stored.at < 24 * 60 * 60 * 1000) {
    listedCache = { at: stored.at, map: new Map(stored.entries) }
    return listedCache.map
  }

  const data = await $fetch('https://openapi.twse.com.tw/v1/opendata/t187ap03_L', {
    headers: { 'User-Agent': 'Mozilla/5.0 (StockPulse)' },
    timeout: 15000,
    retry: 0
  })
  const entries = (Array.isArray(data) ? data : []).map((r) => [
    r['公司代號'],
    { name: r['公司簡稱'], industryCode: r['產業別'] }
  ])
  await store.setItem('twse:listed', { at: Date.now(), entries })
  listedCache = { at: Date.now(), map: new Map(entries) }
  return listedCache.map
}

// 日 K → 週 K（以該週最後交易日為時間點）
export function aggregateWeeklyCandles(daily) {
  const weeks = new Map()
  for (const c of daily) {
    const d = new Date(`${c.time}T00:00:00Z`)
    const day = d.getUTCDay()
    d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day))
    const key = d.toISOString().slice(0, 10)
    const w = weeks.get(key)
    if (!w) {
      weeks.set(key, { ...c })
    } else {
      w.high = Math.max(w.high, c.high)
      w.low = Math.min(w.low, c.low)
      w.close = c.close
      w.volume += c.volume
      w.time = c.time
    }
  }
  return [...weeks.values()]
}
