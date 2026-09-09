// 集保結算所（TDCC）集保戶股權分散表。免費、無金鑰、每週更新（週五）。
// opendata 只提供「最新一週」，本站每週抓一次並累積歷史。
//
// 持股分級：1=1~999 股 … 9=50,001~100,000 股 … 15=1,000,001 股以上、17=合計
// 大戶＝分級 15（≈ 1,000 張以上）；散戶＝分級 1~9 加總（≈ 100 張以下）

const URL = 'https://opendata.tdcc.com.tw/getOD.ashx?id=1-5'
const SNAPSHOT_TTL = 12 * 60 * 60 * 1000

let memo = null

function round2(v) {
  return Math.round(v * 100) / 100
}

function ymdToIso(ymd) {
  const s = String(ymd)
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}

async function fetchSnapshot() {
  const text = await $fetch(URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (StockPulse)' },
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

// 回傳 { latest, history: [{ date, bigShares, retailShares, bigPercent, retailPercent }] }
export async function getTdccHolders(symbol) {
  const snap = await getSnapshot()
  if (!snap || !snap.date) return null

  const row = snap.entries.find(([code]) => code === symbol)?.[1]
  if (!row) return null

  const point = {
    date: snap.date,
    bigShares: row.bigShares,
    retailShares: row.retailShares,
    bigPercent: row.bigPercent,
    retailPercent: row.retailPercent
  }

  const store = useStorage('data')
  const key = `tdcc:hist:${symbol}`
  let hist = (await store.getItem(key)) || []
  if (!hist.length || hist[hist.length - 1].date !== point.date) {
    hist = [...hist, point].slice(-80)
  } else {
    hist[hist.length - 1] = point
  }
  await store.setItem(key, hist)

  return { latest: point, history: hist }
}
