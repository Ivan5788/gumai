import { findMockStock } from './mock-stocks'
import { getTwseDailyCandles } from './twse'
import { getYahooMeta, getYahooQuote } from './yahoo'
import { getFinmindStockInfo } from './finmind'

const TWSE_ENABLED = process.env.NUXT_TWSE_ENABLED !== 'false'
const YAHOO_ENABLED = process.env.NUXT_YAHOO_ENABLED !== 'false'
const FINMIND_ENABLED = process.env.NUXT_FINMIND_ENABLED !== 'false'

const TW_CODE = /^[0-9]{4,6}[A-Z]?$/
const US_CODE = /^[A-Z]{1,5}([.-][A-Z]{1,2})?$/

// 查無資料的代號，短期記住「剛查過、沒有」，避免同一個（可能是亂打的）代號
// 被重複觸發整串外部查詢（FinMind + 證交所 + 2 次 Yahoo）——見資安檢視。
// 換來的代價：真正存在、但剛好遇到上游暫時性錯誤的代號，最多要等這段時間才會重試。
const NEGATIVE_TTL = 15 * 60 * 1000
const negativeMemo = new Map() // symbol -> expiresAt

async function twPreviousClose(symbol, listing) {
  try {
    if (listing === 'TWSE' && TWSE_ENABLED) {
      const d = await getTwseDailyCandles(symbol, 2)
      if (d.length) return d[d.length - 1].close
    }
    if (YAHOO_ENABLED) {
      const q = await getYahooQuote({ symbol, market: 'TW', listing })
      if (q) return q.previousClose
    }
  } catch {
    // null
  }
  return null
}

// 解析任一股票代號 → 股票基本資訊，或 null。
export async function resolveStock(symbol) {
  const s = String(symbol || '').trim().toUpperCase()
  if (!s) return null

  const mock = findMockStock(s)
  if (mock) return mock

  const store = useStorage('data')
  const negKey = `resolve:neg:${s}`
  const memoUntil = negativeMemo.get(s)
  if (memoUntil && Date.now() < memoUntil) return null
  if (!memoUntil) {
    const negCached = await store.getItem(negKey)
    if (negCached && Date.now() - negCached.at < NEGATIVE_TTL) {
      negativeMemo.set(s, negCached.at + NEGATIVE_TTL)
      return null
    }
  }

  const result = await resolveStockLive(s)
  if (!result) {
    negativeMemo.set(s, Date.now() + NEGATIVE_TTL)
    await store.setItem(negKey, { at: Date.now() })
  } else {
    negativeMemo.delete(s)
  }
  return result
}

async function resolveStockLive(s) {
  // ── 台股（上市 / 上櫃）──
  if (TW_CODE.test(s)) {
    const info = FINMIND_ENABLED ? await getFinmindStockInfo(s) : null
    if (info) {
      const listing = info.type === 'twse' ? 'TWSE' : 'TPEx'
      return {
        symbol: s,
        market: 'TW',
        listing,
        name: info.name,
        nameEn: null,
        industry: info.industry || (listing === 'TWSE' ? '上市' : '上櫃'),
        currency: 'TWD',
        previousClose: await twPreviousClose(s, listing)
      }
    }

    // FinMind 不可用時的備援：直接試證交所 / Yahoo
    if (TWSE_ENABLED) {
      try {
        const d = await getTwseDailyCandles(s, 2)
        if (d.length) {
          return {
            symbol: s, market: 'TW', listing: 'TWSE', name: s, nameEn: null,
            industry: '上市', currency: 'TWD', previousClose: d[d.length - 1].close
          }
        }
      } catch {
        // 續試
      }
    }
    if (YAHOO_ENABLED) {
      for (const suffix of ['TW', 'TWO']) {
        try {
          const meta = await getYahooMeta(`${s}.${suffix}`)
          if (meta) {
            return {
              symbol: s, market: 'TW', listing: suffix === 'TW' ? 'TWSE' : 'TPEx',
              name: meta.name || s, nameEn: null,
              industry: suffix === 'TW' ? '上市' : '上櫃', currency: 'TWD',
              previousClose: meta.previousClose ?? null
            }
          }
        } catch {
          // 續試
        }
      }
    }
  }

  // ── 美股 ──
  if (YAHOO_ENABLED && US_CODE.test(s)) {
    try {
      const meta = await getYahooMeta(s)
      if (meta) {
        return {
          symbol: s, market: 'US', listing: null,
          name: meta.name || s, nameEn: meta.name || s,
          industry: '美股', currency: meta.currency || 'USD',
          previousClose: meta.previousClose ?? null
        }
      }
    } catch {
      // null
    }
  }

  return null
}
