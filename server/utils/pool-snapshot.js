// 股票池指標快照：每檔股票算好一列「篩選/訊號用」的欄位，選股與訊號改讀快照，秒回。
// 由 server/plugins/pool-warm.js 於啟動後預熱一次（前一交易日收盤），
// 之後只在尾盤 13:00 / 13:15 兩個時間點各重抓一次（見 dueIntradaySlot），其餘時間不刷新。
// 真實資料未備妥時，先用 mock 快照，背景升級為 live。

import { MOCK_STOCKS } from './mock-stocks'
import { POOL } from './stock-pool'
import { resolveStock } from './stock-resolver'
import { buildMockCandles } from './mock-history'
import { getTwseDailyCandles, refreshTodayForAll } from './twse'
import { mapLimit } from './concurrency'
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
import { getMisQuotesBatch } from './twse-mis'
import { RULE_TESTS } from './screener-rules'
import { scanSignals } from './signal-scanner'

const SIGNAL_LOOKBACK = 15
// 股票池裡看起來像台股代號的（數字開頭，選擇性帶一碼字母，如 00878）
const TW_CODE_RE = /^\d{4,6}[A-Z]?$/

// 選股/訊號規則本身仍以「日K收盤」為準（穩定，一天一個答案），不接盤中連續報價，
// 避免均線站上/回測這類判斷隨盤中價格反覆閃爍。
// 唯一的例外：尾盤兩個時間點（13:00、13:15，台北時間）各重抓一次 MIS 即時報價，
// 覆蓋當天這根K棒的收盤，讓使用者不用等到晚上證交所公布正式收盤才看到「今天」的結果；
// 其餘時間一律沿用上一次快照（也就是前一交易日收盤的結果），不做其他即時更新。
const INTRADAY_SLOTS_MIN = [13 * 60, 13 * 60 + 15] // 13:00、13:15
const INTRADAY_GRACE_MIN = 30 // 時間點過後 30 分鐘內都算「到了該觸發」，容忍排程延遲

let snapshot = null // { rows, source: 'live' | 'mock', builtAt, intraday }
let building = false
let triggeredToday = { dateKey: null, slots: new Set() }

function taipeiClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date)
  const get = (t) => parts.find((p) => p.type === t)?.value
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    weekday: weekdayMap[get('weekday')],
    minutes: Number(get('hour')) * 60 + Number(get('minute'))
  }
}

// 檢查現在是否到了尾盤重抓的時間點，同一天同一個時間點只觸發一次。
function dueIntradaySlot() {
  const { dateKey, weekday, minutes } = taipeiClock()
  if (weekday === 0 || weekday === 6) return null
  if (triggeredToday.dateKey !== dateKey) {
    triggeredToday = { dateKey, slots: new Set() }
  }
  for (const slotMin of INTRADAY_SLOTS_MIN) {
    if (triggeredToday.slots.has(slotMin)) continue
    if (minutes >= slotMin && minutes < slotMin + INTRADAY_GRACE_MIN) {
      triggeredToday.slots.add(slotMin)
      return slotMin
    }
  }
  return null
}

// 用 MIS 即時報價覆蓋（或補上）候選K線陣列的最後一根，當作「今日暫定」收盤。
function overlayIntradayCandle(candles, row) {
  if (!candles.length || !row) return candles
  const last = candles[candles.length - 1]
  const time = row.date ? `${row.date.slice(0, 4)}-${row.date.slice(4, 6)}-${row.date.slice(6, 8)}` : last.time
  const bar = {
    time,
    open: row.open ?? row.price,
    high: row.high ?? row.price,
    low: row.low ?? row.price,
    close: row.price,
    volume: row.volume ?? last.volume ?? 0
  }
  return last.time === time ? [...candles.slice(0, -1), bar] : [...candles, bar]
}

function round2(v) {
  return Math.round((Number(v) || 0) * 100) / 100
}

function buildRow(stock, candles, institutional, holders, misRow) {
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
  // 尾盤覆蓋時，漲跌直接用 MIS 自己算好的（跟個股報價頁同一個基準），
  // 不要用本地K線陣列的前一根去減——那一根可能因為假期缺口等原因跟 MIS 認定的「昨收」不同步，
  // 兩個頁面顯示的漲跌會對不起來。
  const change = misRow ? round2(misRow.change) : round2((last.close ?? 0) - (prev.close ?? last.close ?? 0))
  const changePercent = misRow
    ? round2(misRow.changePercent)
    : prev.close
      ? round2((change / prev.close) * 100)
      : 0

  return {
    symbol: stock.symbol,
    name: stock.name,
    market: stock.market,
    industry: stock.industry,
    close: last.close ?? null,
    change,
    changePercent,
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
      // 背景快照：排低優先權，不擋使用者正在等的請求
      const c = await getTwseDailyCandles(stock.symbol, 6, { priority: 'low' })
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

async function buildLive({ intraday = false } = {}) {
  // 用 STOCK_DAY_ALL 一次請求，把股票池裡所有台股當月快取的最新一天補齊，
  // 取代逐檔打 STOCK_DAY（只影響「已存在」的當月快取，不會建立新月份）。
  try {
    await refreshTodayForAll(POOL.filter((s) => TW_CODE_RE.test(s)))
  } catch {
    // 略過，退回逐檔抓取（candlesFor 仍會照常運作）
  }

  // 有限並行（見 concurrency.js）：上市股票仍受 twse.js 的全域節流佇列保護，
  // 但等佇列輪到的空檔可以順便處理其他檔的 FinMind／Yahoo／集保查詢，
  // 背景快照從 mock 換成真實資料的時間明顯縮短。
  const stocks = (await mapLimit(POOL, 6, (symbol) => resolveStock(symbol).catch(() => null))).filter(
    Boolean
  )

  // 尾盤觸發時，一次批次查詢股票池所有台股的 MIS 即時報價，覆蓋當天K棒收盤。
  // 失敗（例如 MIS 剛好不穩）就整批跳過，各檔維持原本（前一交易日收盤）的資料，不逐檔重試。
  let misRows = new Map()
  if (intraday) {
    try {
      misRows = await getMisQuotesBatch(stocks)
    } catch {
      // 落回：這次不覆蓋今日暫定價
    }
  }

  const results = await mapLimit(stocks, 6, async (stock) => {
    try {
      let candles = await candlesFor(stock)
      const misRow = misRows.get(stock.symbol)
      if (misRow) candles = overlayIntradayCandle(candles, misRow)
      const institutional = await institutionalFor(stock)
      const holders = await holdersFor(stock)
      return buildRow(stock, candles, institutional, holders, misRow)
    } catch {
      return null
    }
  })

  return { rows: results.filter(Boolean), source: 'live', builtAt: Date.now(), intraday }
}

export function ensureFreshSnapshot() {
  if (building) return

  // 還沒有任何一份 live 快照（剛啟動）：先建一份以前一交易日收盤為準的基準快照，
  // 不管現在是不是尾盤時間點。
  if (snapshot?.source !== 'live') {
    building = true
    buildLive()
      .then((s) => {
        if (s.rows.length >= 5) snapshot = s
      })
      .catch(() => {})
      .finally(() => {
        building = false
      })
    return
  }

  // 已經有基準快照：只在 13:00 / 13:15 這兩個時間點重抓一次（MIS 覆蓋今日暫定收盤），
  // 其餘時間都不動，沿用前一交易日收盤的結果。
  if (dueIntradaySlot() == null) return
  building = true
  buildLive({ intraday: true })
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
