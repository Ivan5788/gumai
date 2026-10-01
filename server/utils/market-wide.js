// 全市場技術面快篩：只存 OHLC（不含三大法人/大戶持股），涵蓋「全部」上市＋上櫃個股，
// 用來跑只吃K線的技術面規則（剛站上三短期均線／爆量／突破新高等），不會碰到
// FinMind／集保那些真正容易卡額度的資料源，所以撐得住上千檔的規模。
//
// 上市（TWSE）：MI_INDEX?date=YYYYMMDD&type=ALLBUT0999 —— 官方「單日全市場」端點，
// 支援任意歷史日期、一次回傳當天所有上市個股 OHLC，可以馬上回補完整歷史（~30 個交易日）。
// 上櫃（TPEx）：openapi tpex_mainboard_daily_close_quotes —— 官方限制只回「最新一天」，
// 沒有歷史日期參數（查證過：openapi 文件與網站舊版報表都一樣，不是本站沒串好），
// 只能每天累積一筆，上櫃個股大約要等這個功能上線後 1 個月，天數才會累積到能跑 MA20／
// 20 日新高這類規則；天數不夠的股票會被規則本身的門檻（如 candles.length<21）自然濾掉，
// 不會算出錯的結果，只是「還不會出現在結果裡」。

import { throttle } from './twse'
import { getMisQuotesBatch } from './twse-mis'
import { RULE_TESTS } from './screener-rules'
// SCREENER_RULES_META 來自 shared/utils/，app 與 server 皆自動匯入，不需 import

const MI_INDEX_URL = 'https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX'
const TPEX_DAILY_URL = 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes'
const UA = 'Mozilla/5.0 (GuMai)'
const BACKFILL_TRADING_DAYS = 30 // 覆蓋 MA20／20日新高／量能比較所需天數，留一點餘裕
const BACKFILL_MAX_CALENDAR_DAYS = 50 // 回溯上限（含週末/假日），避免長假期時無限往回找
const KEEP_BARS = 40 // 每檔股票保留的K棒數上限（略多於 BACKFILL_TRADING_DAYS，滾動視窗）
const STORE_KEY = 'market-wide:snapshot'
// RULE_TESTS／TECH_RULE_IDS 的判斷邏輯有變動時要手動 +1：flags 是跟著K線資料一起
// 持久化的，單純改規則程式碼、重啟伺服器並不會自動重算，靠這個版號強制重算一次
// （只是重跑既有K線的規則函式，不必重新抓資料，很快）。
const RULES_VERSION = 2
// 只收一般個股（4 碼數字）。兩邊「全市場」端點實際上會把 ETF／債券 ETF／存託憑證
// 等也混在一起回傳（例如上櫃 00679B 元大美債20年）——這些不是使用者說的「選股」，
// 價格幾乎不動也會稀釋均線/爆量/創高這類技術條件的意義，直接濾掉。
const STOCK_CODE_RE = /^\d{4}$/
const DAILY_TRIGGER_MIN = 15 * 60 // 每天 15:00（台北時間）補官方收盤後資料，早於此在等兩邊結算
// 盤中兩個時間點（比照 pool-snapshot.js 的股票池精選）用 MIS 批次報價覆蓋「今日」
// 這根K棒，讓全市場快篩也不用等到 15:00 收盤後才看到今天的暫定結果；15:00 的官方
// 資料之後還是會照常把這個暫定值換成正式收盤（mergeRows 同一天直接覆蓋，不會疊加）。
const INTRADAY_SLOTS_MIN = [13 * 60, 13 * 60 + 15]
const INTRADAY_GRACE_MIN = 30

// 只有純技術面（只吃K線）的規則適用全市場快篩；籌碼面規則需要法人/持股資料，這裡沒有。
const TECH_RULE_IDS = SCREENER_RULES_META.filter((r) => r.category === 'tech').map((r) => r.id)

function toNumber(s) {
  const n = Number(String(s).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}

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

// ── 抓取：單日全市場 ────────────────────────────────────

async function fetchTwseAllDay(yyyymmdd) {
  const res = await throttle(
    () =>
      $fetch(MI_INDEX_URL, {
        params: { date: yyyymmdd, type: 'ALLBUT0999', response: 'json' },
        headers: { 'User-Agent': UA },
        timeout: 15000,
        retry: 0
      }),
    { priority: 'low', key: `mi-index:${yyyymmdd}` }
  )
  if (!res || res.stat !== 'OK' || !Array.isArray(res.tables)) return null
  const table = res.tables.find((t) => Array.isArray(t.fields) && t.fields[0] === '證券代號')
  if (!table || !Array.isArray(table.data)) return null

  const iso = `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`
  const rows = []
  for (const r of table.data) {
    const symbol = String(r[0]).trim()
    if (!STOCK_CODE_RE.test(symbol)) continue
    const open = toNumber(r[5])
    const high = toNumber(r[6])
    const low = toNumber(r[7])
    const close = toNumber(r[8])
    if (open == null || high == null || low == null || close == null) continue
    rows.push({
      symbol,
      name: String(r[1]).trim(),
      listing: 'TWSE',
      bar: { time: iso, open, high, low, close, volume: Math.round((toNumber(r[2]) || 0) / 1000) }
    })
  }
  return rows
}

// TPEx openapi 只有「最新一天」，沒有歷史日期參數——只能拿今天的，拿不到就是拿不到。
async function fetchTpexLatestDay() {
  const res = await $fetch(TPEX_DAILY_URL, {
    headers: { 'User-Agent': UA },
    timeout: 20000,
    retry: 0
  })
  if (!Array.isArray(res) || !res.length) return null

  const roc = String(res[0].Date || '')
  if (!roc) return null
  const y = Number(roc.slice(0, roc.length - 4)) + 1911
  const iso = `${y}-${roc.slice(-4, -2)}-${roc.slice(-2)}`

  const rows = []
  for (const r of res) {
    const symbol = String(r.SecuritiesCompanyCode || '').trim()
    if (!STOCK_CODE_RE.test(symbol)) continue
    const open = toNumber(r.Open)
    const high = toNumber(r.High)
    const low = toNumber(r.Low)
    const close = toNumber(r.Close)
    if (open == null || high == null || low == null || close == null) continue
    rows.push({
      symbol,
      name: String(r.CompanyName || '').trim(),
      listing: 'TPEx',
      bar: { time: iso, open, high, low, close, volume: Math.round((toNumber(r.TradingShares) || 0) / 1000) }
    })
  }
  return rows
}

// ── 快照狀態（記憶體 + 持久化）────────────────────────────

let store = new Map() // symbol -> { name, listing, candles: [{time,open,high,low,close,volume}], flags }
let meta = { backfillDone: false, lastTwseDate: null, lastTpexDate: null, updatedAt: null, intraday: false }
let backfilling = false
let triggeredToday = { dateKey: null, dailyDone: false, intradaySlots: new Set() }

// 用 MIS 即時報價覆蓋（或補上）候選K線陣列的最後一根，當作「今日暫定」收盤
// （跟 pool-snapshot.js 的同名函式邏輯一致，兩邊各自維護自己的資料，沒有共用狀態可拆）。
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

// 盤中時間點是否到了（同一天同一個時間點只觸發一次）。
function dueIntradaySlot() {
  const { dateKey, weekday, minutes } = taipeiClock()
  if (weekday === 0 || weekday === 6) return null
  if (triggeredToday.dateKey !== dateKey) {
    triggeredToday = { dateKey, dailyDone: false, intradaySlots: new Set() }
  }
  for (const slotMin of INTRADAY_SLOTS_MIN) {
    if (triggeredToday.intradaySlots.has(slotMin)) continue
    if (minutes >= slotMin && minutes < slotMin + INTRADAY_GRACE_MIN) {
      triggeredToday.intradaySlots.add(slotMin)
      return slotMin
    }
  }
  return null
}

function mergeRows(rows) {
  if (!rows) return
  for (const { symbol, name, listing, bar } of rows) {
    let entry = store.get(symbol)
    if (!entry) {
      entry = { name, listing, candles: [] }
      store.set(symbol, entry)
    }
    entry.name = name
    const idx = entry.candles.findIndex((c) => c.time === bar.time)
    if (idx === -1) entry.candles.push(bar)
    else entry.candles[idx] = bar
  }
}

function trimAndFlag() {
  for (const entry of store.values()) {
    entry.candles.sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0))
    if (entry.candles.length > KEEP_BARS) {
      entry.candles = entry.candles.slice(entry.candles.length - KEEP_BARS)
    }
    const flags = {}
    for (const id of TECH_RULE_IDS) {
      try {
        flags[id] = Boolean(RULE_TESTS[id]({ candles: entry.candles }))
      } catch {
        flags[id] = false
      }
    }
    entry.flags = flags
  }
}

async function persist() {
  meta.updatedAt = Date.now()
  await useStorage('data').setItem(STORE_KEY, {
    meta,
    entries: [...store.entries()]
  })
}

async function restore() {
  const saved = await useStorage('data').getItem(STORE_KEY)
  if (saved?.entries) {
    store = new Map(saved.entries)
    meta = { ...meta, ...saved.meta }
    return true
  }
  return false
}

// ── 回補歷史（僅上市；上櫃官方無歷史端點，只能之後逐日累積）────

async function backfillTwse() {
  let collected = 0
  for (let i = 0; i < BACKFILL_MAX_CALENDAR_DAYS && collected < BACKFILL_TRADING_DAYS; i += 1) {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - i)
    // 用台北時間判斷星期（跟交易日對齊），避免 UTC 換日造成偏移
    const { weekday, dateKey } = taipeiClock(d)
    if (weekday === 0 || weekday === 6) continue
    const yyyymmdd = dateKey.replace(/-/g, '')
    try {
      const rows = await fetchTwseAllDay(yyyymmdd)
      if (rows && rows.length) {
        mergeRows(rows)
        collected += 1
        if (!meta.lastTwseDate || dateKey > meta.lastTwseDate) meta.lastTwseDate = dateKey
      }
    } catch {
      // 該日失敗（例如假期、暫時被擋）就跳過，不中斷整段回補
    }
  }
}

export function ensureMarketWideSnapshot() {
  if (backfilling) return

  if (!meta.backfillDone) {
    backfilling = true
    ;(async () => {
      if (!store.size) await restore()
      if (meta.backfillDone) return
      await backfillTwse()
      try {
        const tpex = await fetchTpexLatestDay()
        if (tpex) {
          mergeRows(tpex)
          meta.lastTpexDate = tpex[0]?.bar.time || meta.lastTpexDate
        }
      } catch {
        // 上櫃今天抓不到就算了，之後每天的觸發還會再試
      }
      trimAndFlag()
      meta.backfillDone = store.size > 0
      meta.rulesVersion = RULES_VERSION
      await persist()
    })()
      .catch(() => {})
      .finally(() => {
        backfilling = false
      })
    return
  }

  // 已回補過：盤中 13:00／13:15 用 MIS 覆蓋今日暫定值，15:00 補一次官方收盤後資料，
  // 其餘時間不動。同一輪只做其中一件（backfilling 旗標擋住同時觸發），兩種觸發
  // 互相獨立判斷，先看是不是到了盤中時間點。
  const intradaySlot = dueIntradaySlot()
  if (intradaySlot != null) {
    backfilling = true
    ;(async () => {
      try {
        const misRows = await getMisQuotesBatch([...store.entries()].map(([symbol, e]) => ({ symbol, market: 'TW', listing: e.listing })))
        for (const [symbol, row] of misRows) {
          const entry = store.get(symbol)
          if (!entry) continue
          entry.candles = overlayIntradayCandle(entry.candles, row)
          // 漲跌直接用 MIS 自己算好的，不要用本地K線陣列前一根去減——那一根可能因為
          // 假期缺口等原因跟 MIS 認定的「昨收」不同步（跟 pool-snapshot.js 同一個教訓）。
          entry.intradayChange = { change: row.change, changePercent: row.changePercent }
        }
        meta.intraday = misRows.size > 0
      } catch {
        // 落回：這次不覆蓋今日暫定價
      }
      trimAndFlag()
      await persist()
    })()
      .catch(() => {})
      .finally(() => {
        backfilling = false
      })
    return
  }

  const { dateKey, weekday, minutes } = taipeiClock()
  if (weekday === 0 || weekday === 6) return
  if (triggeredToday.dailyDone) return
  if (minutes < DAILY_TRIGGER_MIN) return

  triggeredToday.dailyDone = true
  backfilling = true
  ;(async () => {
    const yyyymmdd = dateKey.replace(/-/g, '')
    try {
      const rows = await fetchTwseAllDay(yyyymmdd)
      if (rows && rows.length) {
        mergeRows(rows)
        meta.lastTwseDate = dateKey
        // 官方正式收盤資料已經補到，蓋掉盤中暫定值留下的 intradayChange
        for (const { symbol } of rows) {
          const entry = store.get(symbol)
          if (entry) delete entry.intradayChange
        }
      }
    } catch {
      // 落回：上市今天沒補到，維持原本資料
    }
    try {
      const tpex = await fetchTpexLatestDay()
      if (tpex && tpex.length) {
        mergeRows(tpex)
        meta.lastTpexDate = tpex[0].bar.time
        for (const { symbol } of tpex) {
          const entry = store.get(symbol)
          if (entry) delete entry.intradayChange
        }
      }
    } catch {
      // 落回：上櫃今天沒補到
    }
    meta.intraday = false // 15:00 這次用的是官方正式收盤資料，不是暫定值
    trimAndFlag()
    await persist()
  })()
    .catch(() => {})
    .finally(() => {
      backfilling = false
    })
}

let flagsRechecked = false

export async function getMarketWideSnapshot() {
  if (!store.size) {
    await restore()
    if (store.size) trimAndFlag()
  }
  if (!flagsRechecked && store.size && meta.rulesVersion !== RULES_VERSION) {
    flagsRechecked = true
    trimAndFlag()
    meta.rulesVersion = RULES_VERSION
    await persist()
  }
  ensureMarketWideSnapshot()
  return { meta, store }
}

export { TECH_RULE_IDS }
