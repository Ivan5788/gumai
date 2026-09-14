// 台股大盤指數：加權指數（TAIEX）與櫃買指數（TPEx）。
//
// 皆為官方免費、盤後（T+0 收盤後）資料：
//  - 加權指數：證交所「發行量加權股價指數歷史資料」MI_5MINS_HIST（當月每日 OHLC）
//  - 櫃買指數：櫃買中心 openapi tpex_index（當月每日 OHLC + 漲跌）
//
// 盤中即時指數需 mis.twse.com.tw（本環境不穩，且非官方 opendata），暫不接。

import { aggregateWeeklyCandles } from './twse'
import {
  getFinmindIndexCandles
} from './finmind'
import { getYahooChartBySymbol, getYahooIntradayBySymbol } from './yahoo'

const TAIEX_URL = 'https://www.twse.com.tw/rwd/zh/TAIEX/MI_5MINS_HIST?response=json'
const TPEX_URL = 'https://www.tpex.org.tw/openapi/v1/tpex_index'
const TTL = 10 * 60 * 1000
const UA = 'Mozilla/5.0 (StockPulse)'

const FINMIND_ENABLED = process.env.NUXT_FINMIND_ENABLED !== 'false'
const YAHOO_ENABLED = process.env.NUXT_YAHOO_ENABLED !== 'false'

// 支援的大盤指數。yahoo 僅加權有（^TWII）；櫃買 Yahoo 資料已停更，只提供日/週 K。
export const INDEX_META = {
  TAIEX: { code: 'TAIEX', name: '加權指數', market: '上市', finmind: 'TAIEX', yahoo: '^TWII' },
  TPEX: { code: 'TPEX', name: '櫃買指數', market: '上櫃', finmind: 'TPEx', yahoo: null }
}

export function resolveIndex(code) {
  return INDEX_META[String(code || '').trim().toUpperCase()] || null
}

let memo = null

function round2(v) {
  return Math.round(v * 100) / 100
}

function num(s) {
  const n = Number(String(s).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}

// 支援 "115/09/09"（民國）與 "20260909"
function toIso(raw) {
  const s = String(raw).trim()
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
  const m = s.match(/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/)
  if (m) {
    const y = Number(m[1]) + 1911
    return `${y}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
  }
  return null
}

function pack({ code, name, market, close, prevClose, open, high, low, date, source }) {
  const change = round2(close - prevClose)
  return {
    code,
    name,
    market,
    value: round2(close),
    change,
    changePercent: prevClose ? round2((change / prevClose) * 100) : 0,
    prevClose: round2(prevClose),
    open: open != null ? round2(open) : null,
    high: high != null ? round2(high) : null,
    low: low != null ? round2(low) : null,
    date,
    source
  }
}

async function fetchTaiexFromTwse() {
  const res = await $fetch(TAIEX_URL, {
    headers: { 'User-Agent': UA },
    timeout: 12000,
    retry: 0
  })
  const rows = Array.isArray(res?.data) ? res.data : []
  if (rows.length < 2) return null
  // fields: 日期,開盤指數,最高指數,最低指數,收盤指數
  const lastRow = rows[rows.length - 1]
  const prevRow = rows[rows.length - 2]
  const close = num(lastRow[4])
  const prevClose = num(prevRow[4])
  if (close == null || prevClose == null) return null
  return pack({
    code: 'TAIEX',
    name: '加權指數',
    market: '上市',
    close,
    prevClose,
    open: num(lastRow[1]),
    high: num(lastRow[2]),
    low: num(lastRow[3]),
    date: toIso(res.date || lastRow[0]),
    source: 'twse'
  })
}

// 備援：證交所 MI_5MINS_HIST 偶爾會被 WAF 暫時擋下（跟本站請求量無關的獨立限流）。
// 這種時候改用 Yahoo 的 ^TWII 日線，取最後兩根算漲跌。
async function fetchTaiexFromYahoo() {
  const candles = await getYahooChartBySymbol('^TWII', '1d', '5d')
  if (candles.length < 2) return null
  const last = candles[candles.length - 1]
  const prev = candles[candles.length - 2]
  return pack({
    code: 'TAIEX',
    name: '加權指數',
    market: '上市',
    close: last.close,
    prevClose: prev.close,
    open: last.open,
    high: last.high,
    low: last.low,
    date: last.time,
    source: 'yahoo'
  })
}

async function fetchTaiex() {
  try {
    const r = await fetchTaiexFromTwse()
    if (r) return r
  } catch {
    // 落到 Yahoo
  }
  if (!YAHOO_ENABLED) return null
  return fetchTaiexFromYahoo()
}

async function fetchTpex() {
  const rows = await $fetch(TPEX_URL, {
    headers: { 'User-Agent': UA, Referer: 'https://www.tpex.org.tw/' },
    timeout: 12000,
    retry: 0
  })
  if (!Array.isArray(rows) || rows.length < 2) return null
  const last = rows[rows.length - 1]
  const close = num(last.Close)
  const chg = num(last.Change)
  const prevClose = close != null && chg != null ? close - chg : num(rows[rows.length - 2].Close)
  if (close == null || prevClose == null) return null
  return pack({
    code: 'TPEX',
    name: '櫃買指數',
    market: '上櫃',
    close,
    prevClose,
    open: num(last.Open),
    high: num(last.High),
    low: num(last.Low),
    date: toIso(last.Date),
    source: 'tpex'
  })
}

async function build() {
  const [taiex, tpex] = await Promise.all([
    fetchTaiex().catch(() => null),
    fetchTpex().catch(() => null)
  ])
  const indices = [taiex, tpex].filter(Boolean)
  return { at: Date.now(), updatedAt: new Date().toISOString(), indices }
}

// { updatedAt, indices: [{ code, name, market, value, change, changePercent, prevClose, open, high, low, date, source }] }
export async function getMarketIndices() {
  if (memo && Date.now() - memo.at < TTL) return memo

  const store = useStorage('data')
  const cached = await store.getItem('index:snapshot')
  if (cached && Date.now() - cached.at < TTL) {
    memo = cached
    return memo
  }

  try {
    const fresh = await build()
    if (fresh.indices.length) {
      // 依代號合併：這次沒抓到的指數（單一來源暫時失敗/被擋）保留上次的值，
      // 不要讓單一指數的短暫失敗把另一個已經抓到的指數也一起沖掉。
      const byCode = new Map((cached?.indices || []).map((i) => [i.code, i]))
      for (const i of fresh.indices) byCode.set(i.code, i)
      const merged = { at: fresh.at, updatedAt: fresh.updatedAt, indices: [...byCode.values()] }

      await store.setItem('index:snapshot', merged)
      memo = merged
      return memo
    }
  } catch {
    // 落回快取
  }
  return memo || cached || { updatedAt: null, indices: [] }
}

// ── 指數走勢圖 ──────────────────────────────────────────

const HISTORY_INTERVALS = ['1d', '1wk', '60m']

// GET 用：{ code, name, interval, candles, source }
export async function getIndexHistory(code, interval = '1d') {
  const meta = resolveIndex(code)
  if (!meta) return null
  const iv = HISTORY_INTERVALS.includes(interval) ? interval : '1d'

  // 60 分 K → Yahoo（僅加權）
  if (iv === '60m') {
    if (YAHOO_ENABLED && meta.yahoo) {
      try {
        const candles = await getYahooChartBySymbol(meta.yahoo, '60m', '3mo')
        if (candles.length >= 20) {
          return { code: meta.code, name: meta.name, interval: iv, candles, source: 'yahoo' }
        }
      } catch {
        // 落回
      }
    }
    return { code: meta.code, name: meta.name, interval: iv, candles: [], source: null }
  }

  // 日 K / 週 K → FinMind
  if (FINMIND_ENABLED) {
    try {
      const daily = await getFinmindIndexCandles(meta.finmind)
      if (daily.length >= 20) {
        const candles = iv === '1wk' ? aggregateWeeklyCandles(daily) : daily
        return { code: meta.code, name: meta.name, interval: iv, candles, source: 'finmind' }
      }
    } catch {
      // 落回
    }
  }

  return { code: meta.code, name: meta.name, interval: iv, candles: [], source: null }
}

// GET 用：{ code, name, date, previousClose, points, source }（僅加權有分時）
export async function getIndexIntraday(code) {
  const meta = resolveIndex(code)
  if (!meta) return null
  if (YAHOO_ENABLED && meta.yahoo) {
    try {
      const res = await getYahooIntradayBySymbol(meta.yahoo)
      if (res && res.points?.length) {
        return { code: meta.code, name: meta.name, source: 'yahoo', ...res }
      }
    } catch {
      // 落回
    }
  }
  return { code: meta.code, name: meta.name, source: null, date: null, previousClose: null, points: [] }
}
