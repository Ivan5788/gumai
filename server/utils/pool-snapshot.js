// 股票池指標快照：每檔股票算好一列「篩選/訊號用」的欄位，選股與訊號改讀快照，秒回。
// 由 server/plugins/pool-warm.js 於啟動後預熱、每 3 小時刷新。
// 真實資料未備妥時，先用 mock 快照，背景升級為 live。

import { MOCK_STOCKS } from './mock-stocks'
import { POOL } from './stock-pool'
import { resolveStock } from './stock-resolver'
import { buildMockCandles } from './mock-history'
import { getTwseDailyCandles, refreshTodayForAll } from './twse'
import { getYahooDaily } from './yahoo'
import { getFinmindInstitutional } from './finmind'
import {
  assembleInstitutional,
  assembleHolders,
  buildMockInstitutional,
  buildMockHolders
} from './mock-institutional'
import { buildMockBigPower } from './mock-bigpower'
import { getTdccHolders } from './tdcc'
import { RULE_TESTS } from './screener-rules'
import { scanSignals } from './signal-scanner'

const REFRESH_MS = 3 * 60 * 60 * 1000
const SIGNAL_LOOKBACK = 15
// 股票池裡看起來像台股代號的（數字開頭，選擇性帶一碼字母，如 00878）
const TW_CODE_RE = /^\d{4,6}[A-Z]?$/

let snapshot = null // { rows, source: 'live' | 'mock', builtAt }
let building = false

function round2(v) {
  return Math.round((Number(v) || 0) * 100) / 100
}

function buildRow(stock, candles, institutional, holders) {
  const bigPower = buildMockBigPower(stock) // 大戶買賣力仍為示範
  const ctx = { stock, candles, institutional, holders, bigPower }

  const flags = {}
  for (const id of SCREENER_RULE_IDS) {
    try {
      flags[id] = Boolean(RULE_TESTS[id](ctx))
    } catch {
      flags[id] = false
    }
  }

  const events = scanSignals({ candles, institutional, bigPower }, SIGNAL_LOOKBACK)

  const last = candles[candles.length - 1] || {}
  const prev = candles[candles.length - 2] || {}
  const change = round2((last.close ?? 0) - (prev.close ?? last.close ?? 0))

  return {
    symbol: stock.symbol,
    name: stock.name,
    market: stock.market,
    industry: stock.industry,
    close: last.close ?? null,
    change,
    changePercent: prev.close ? round2((change / prev.close) * 100) : 0,
    volume: last.volume ?? null,
    dataDate: last.time ?? null,
    flags,
    events
  }
}

async function candlesFor(stock) {
  try {
    if (stock.listing === 'TWSE') {
      // 選股/訊號只需 MA60 + 回看窗，6 個月足夠；不隨走勢圖擴大到 2 年
      const c = await getTwseDailyCandles(stock.symbol, 6)
      if (c.length >= 60) return c
    } else if (stock.market === 'US') {
      const c = await getYahooDaily(stock)
      if (c.length >= 60) return c
    }
  } catch {
    // 落回示範
  }
  return buildMockCandles(stock, { interval: '1d', pinLast: false })
}

async function institutionalFor(stock) {
  if (stock.listing !== 'TWSE') return buildMockInstitutional(stock)
  try {
    const days = await getFinmindInstitutional(stock.symbol)
    if (days.length >= 10) {
      return assembleInstitutional(stock, days, { interval: '1d', source: 'finmind' })
    }
  } catch {
    // 落回示範
  }
  return buildMockInstitutional(stock)
}

async function holdersFor(stock) {
  if (stock.market === 'TW' && stock.listing) {
    try {
      // 掃描時不即時回補（避免對集保大量請求）；由 tdcc-backfill 外掛緩慢預熱。
      const t = await getTdccHolders(stock.symbol, { backfill: false })
      if (t && t.history.length) return assembleHolders(stock, t.history, 'tdcc')
    } catch {
      // 落回示範
    }
  }
  return buildMockHolders(stock)
}

function mockSnapshot() {
  const rows = MOCK_STOCKS.map((stock) =>
    buildRow(
      stock,
      buildMockCandles(stock, { interval: '1d', pinLast: false }),
      buildMockInstitutional(stock),
      buildMockHolders(stock)
    )
  )
  return { rows, source: 'mock', builtAt: Date.now() }
}

async function buildLive() {
  const rows = []

  // 用 STOCK_DAY_ALL 一次請求，把股票池裡所有台股當月快取的最新一天補齊，
  // 取代逐檔打 STOCK_DAY（只影響「已存在」的當月快取，不會建立新月份）。
  try {
    await refreshTodayForAll(POOL.filter((s) => TW_CODE_RE.test(s)))
  } catch {
    // 略過，退回逐檔抓取（candlesFor 仍會照常運作）
  }

  for (const symbol of POOL) {
    try {
      const stock = await resolveStock(symbol)
      if (!stock) continue
      const candles = await candlesFor(stock)
      const institutional = await institutionalFor(stock)
      const holders = await holdersFor(stock)
      rows.push(buildRow(stock, candles, institutional, holders))
    } catch {
      // 略過此股
    }
  }
  return { rows, source: 'live', builtAt: Date.now() }
}

export function ensureFreshSnapshot() {
  if (building) return
  if (snapshot?.source === 'live' && Date.now() - snapshot.builtAt < REFRESH_MS) return
  building = true
  buildLive()
    .then((s) => {
      if (s.rows.length >= 5) snapshot = s
    })
    .catch(() => {})
    .finally(() => {
      building = false
    })
}

export async function getPoolSnapshot() {
  ensureFreshSnapshot()
  if (!snapshot) snapshot = mockSnapshot()
  return snapshot
}
