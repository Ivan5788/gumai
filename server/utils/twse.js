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

  if (!res || res.stat !== 'OK' || !Array.isArray(res.data)) return []

  return res.data
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
    const rows = await throttle(() => fetchMonthRaw(stockNo, year, month))
    // 過往月份即使空的也快取（該股當時未上市）；當月為空則不覆蓋既有快取
    if (rows.length || !isCurrent) {
      await store.setItem(key, { at: Date.now(), rows })
    }
    return rows.length ? rows : cached?.rows || []
  } catch {
    return cached?.rows || []
  }
}

// 取得近 monthsBack 個月的日 K，已排序去重
export async function getTwseDailyCandles(stockNo, monthsBack = 8) {
  const now = new Date()
  const out = new Map()

  for (let i = monthsBack - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const rows = await getMonth(stockNo, d.getFullYear(), d.getMonth() + 1)
    for (const r of rows) out.set(r.time, r)
  }

  return [...out.values()].sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
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
