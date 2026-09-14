// 集保結算所（TDCC）集保戶股權分散表。免費、無金鑰、每週更新（週五）。
//
// 兩個來源：
//  1. opendata getOD.ashx?id=1-5 —— 全市場、但只有「最新一週」。用於快速取得最新一週。
//  2. 個股歷史查詢頁 qryStock —— 逐檔、可查近約一年的每週結算（約 51 週）。
//     用於首次載入時回補近 8 週，之後靠 opendata 每週接續。
//
// 持股分級：1=1~999 股 … 9=50,001~100,000 股 … 15=1,000,001 股以上、16/17=合計
// 大戶＝分級 15（≈ 1,000 張以上）；散戶＝分級 1~9 加總（≈ 100 張以下）

const OPENDATA_URL = 'https://opendata.tdcc.com.tw/getOD.ashx?id=1-5'
const QRY_URL = 'https://www.tdcc.com.tw/portal/zh/smWeb/qryStock'
const SNAPSHOT_TTL = 12 * 60 * 60 * 1000
const DATES_TTL = 12 * 60 * 60 * 1000
const UA = 'Mozilla/5.0 (GuMai; +holders)'

let memo = null // opendata 最新一週快照
let datesMemo = null // { at, dates: [yyyymmdd 由新到舊] }

function round2(v) {
  return Math.round(v * 100) / 100
}

function ymdToIso(ymd) {
  const s = String(ymd)
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ── opendata：最新一週全市場 ──────────────────────────────

async function fetchSnapshot() {
  const text = await $fetch(OPENDATA_URL, {
    headers: { 'User-Agent': UA },
    timeout: 30000,
    retry: 0,
    responseType: 'text'
  })

  const lines = String(text).split('\n')
  const acc = new Map()
  let date = null

  for (let i = 1; i < lines.length; i += 1) {
    const p = lines[i].split(',')
    if (p.length < 6) continue
    const d = p[0].trim()
    const code = p[1].trim()
    const level = Number(p[2])
    const shares = Number(p[4]) || 0
    const pct = Number(p[5]) || 0
    if (!code || !Number.isFinite(level)) continue
    if (!date && /^\d{8}$/.test(d)) date = d

    let e = acc.get(code)
    if (!e) {
      e = { bigShares: 0, bigPercent: 0, retailShares: 0, retailPercent: 0, totalShares: 0 }
      acc.set(code, e)
    }
    if (level === 15) {
      e.bigShares = Math.round(shares / 1000)
      e.bigPercent = pct
    } else if (level >= 1 && level <= 9) {
      e.retailShares += shares
      e.retailPercent += pct
    } else if (level === 17) {
      e.totalShares = Math.round(shares / 1000)
    }
  }

  const entries = []
  for (const [code, e] of acc) {
    entries.push([
      code,
      {
        bigShares: e.bigShares,
        bigPercent: round2(e.bigPercent),
        retailShares: Math.round(e.retailShares / 1000),
        retailPercent: round2(e.retailPercent),
        totalShares: e.totalShares
      }
    ])
  }

  return { at: Date.now(), date: date ? ymdToIso(date) : null, entries }
}

async function getSnapshot() {
  if (memo && Date.now() - memo.at < SNAPSHOT_TTL) return memo
  const store = useStorage('data')
  const cached = await store.getItem('tdcc:snapshot')
  if (cached && Date.now() - cached.at < SNAPSHOT_TTL) {
    memo = cached
    return memo
  }
  try {
    const fresh = await fetchSnapshot()
    if (fresh.entries.length) {
      await store.setItem('tdcc:snapshot', fresh)
      memo = fresh
    }
    return memo || cached || null
  } catch {
    return cached || null
  }
}

// ── qryStock：個股歷史（近約一年，每週） ──────────────────

// 取查詢頁：回傳 { cookie, token, dates }。token 為單次有效，每次 POST 前需重取。
async function fetchQryPage() {
  const res = await $fetch.raw(QRY_URL, {
    headers: { 'User-Agent': UA },
    timeout: 20000,
    retry: 0,
    responseType: 'text'
  })
  const setCookie = res.headers.get('set-cookie') || ''
  const cookie = setCookie
    .split(/,(?=[^;]+?=)/)
    .map((s) => s.split(';')[0].trim())
    .filter(Boolean)
    .join('; ')
  const html = String(res._data || '')
  const token = html.match(/name="SYNCHRONIZER_TOKEN"\s+value="([^"]+)"/)?.[1] || ''
  const dates = [...html.matchAll(/<option value="(\d{8})"/g)].map((m) => m[1])
  return { cookie, token, dates }
}

async function getQryDates() {
  if (datesMemo && Date.now() - datesMemo.at < DATES_TTL) return datesMemo.dates
  try {
    const { dates } = await fetchQryPage()
    if (dates.length) {
      datesMemo = { at: Date.now(), dates }
      return dates
    }
  } catch {
    // 略
  }
  return datesMemo?.dates || []
}

// 解析 qryStock 結果表：回傳 16 級 [{ level, people, shares, percent }]
function parseLevels(html) {
  const re =
    /<td[^>]*>\s*(\d{1,2})\s*<\/td>\s*<td[^>]*>[^<]*<\/td>\s*<td[^>]*>([\d,]+)<\/td>\s*<td[^>]*>([\d,]+)<\/td>\s*<td[^>]*>([\d.]+)/g
  const out = []
  let m
  while ((m = re.exec(html))) {
    out.push({
      level: Number(m[1]),
      people: Number(m[2].replace(/,/g, '')) || 0,
      shares: Number(m[3].replace(/,/g, '')) || 0,
      percent: Number(m[4]) || 0
    })
  }
  return out
}

// 查單一股票、單一結算日。回傳 { date(iso), bigShares, retailShares, bigPercent, retailPercent } 或 null。
async function fetchStockWeek(ymd, stockNo) {
  const page = await fetchQryPage()
  if (!page.token) return null

  const body = new URLSearchParams({
    SYNCHRONIZER_TOKEN: page.token,
    SYNCHRONIZER_URI: '/portal/zh/smWeb/qryStock',
    method: 'submit',
    firDate: ymd,
    scaDate: ymd,
    sqlMethod: 'StockNo',
    stockNo,
    stockName: ''
  })

  const html = await $fetch(QRY_URL, {
    method: 'POST',
    headers: {
      'User-Agent': UA,
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: page.cookie
    },
    timeout: 20000,
    retry: 0,
    responseType: 'text',
    body: body.toString()
  })

  const levels = parseLevels(String(html))
  if (!levels.length) return null

  const at = (l) => levels.find((x) => x.level === l)
  const big = at(15)
  const retailLv = levels.filter((x) => x.level >= 1 && x.level <= 9)
  if (!retailLv.length) return null

  const retailShares = retailLv.reduce((s, x) => s + x.shares, 0)
  const retailPercent = retailLv.reduce((s, x) => s + x.percent, 0)

  return {
    date: ymdToIso(ymd),
    bigShares: Math.round((big?.shares || 0) / 1000),
    retailShares: Math.round(retailShares / 1000),
    bigPercent: round2(big?.percent || 0),
    retailPercent: round2(retailPercent)
  }
}

// 回補個股近 `weeks` 週集保週資料。逐週永久快取（歷史週結算不會再變）。
// 盡力而為：任何一週失敗就跳過，回傳目前拿得到的（升冪）。
export async function getTdccHistory(symbol, weeks = 8) {
  const store = useStorage('data')
  const dates = (await getQryDates()).slice(0, Math.max(1, weeks))
  const points = []

  for (const ymd of dates) {
    const key = `tdcc:wk:${symbol}:${ymd}`
    const cached = await store.getItem(key)
    if (cached) {
      points.push(cached)
      continue
    }
    try {
      const point = await fetchStockWeek(ymd, symbol)
      if (point) {
        await store.setItem(key, point)
        points.push(point)
      }
      await sleep(450) // 節流：僅在實際打了請求後
    } catch {
      // 跳過這一週
    }
  }

  return points.sort((a, b) => a.date.localeCompare(b.date))
}

// ── 對外：合併最新一週 + 歷史 ────────────────────────────

function mergePoints(...lists) {
  const map = new Map()
  for (const list of lists) {
    for (const p of list || []) {
      if (p && p.date) map.set(p.date, { ...map.get(p.date), ...p })
    }
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-80)
}

// 回傳 { latest, history: [{ date, bigShares, retailShares, bigPercent, retailPercent }] }
// backfill=true（個股頁）：首次回補近 `weeks` 週；backfill=false（股票池掃描）：只用已快取的。
export async function getTdccHolders(symbol, { backfill = true, weeks = 8 } = {}) {
  const store = useStorage('data')
  const key = `tdcc:hist:${symbol}`
  const stored = (await store.getItem(key)) || []

  const snap = await getSnapshot()
  const snapRow = snap?.date
    ? snap.entries.find(([code]) => code === symbol)?.[1]
    : null
  const snapPoint = snapRow
    ? {
        date: snap.date,
        bigShares: snapRow.bigShares,
        retailShares: snapRow.retailShares,
        bigPercent: snapRow.bigPercent,
        retailPercent: snapRow.retailPercent
      }
    : null

  let backfilled = []
  if (backfill) {
    try {
      backfilled = await getTdccHistory(symbol, weeks)
    } catch {
      // 略
    }
  }

  const history = mergePoints(stored, backfilled, snapPoint ? [snapPoint] : [])
  if (!history.length) return null

  if (
    history.length !== stored.length ||
    history.some((p, i) => p.date !== stored[i]?.date || p.bigShares !== stored[i]?.bigShares)
  ) {
    await store.setItem(key, history)
  }

  return { latest: snapPoint || history[history.length - 1], history }
}
