import { findMockStock } from './mock-stocks'
import { getTwseDailyCandles } from './twse'
import { getYahooMeta, getYahooQuote } from './yahoo'
import { getFinmindStockInfo } from './finmind'

const TWSE_ENABLED = process.env.NUXT_TWSE_ENABLED !== 'false'
const YAHOO_ENABLED = process.env.NUXT_YAHOO_ENABLED !== 'false'
const FINMIND_ENABLED = process.env.NUXT_FINMIND_ENABLED !== 'false'

const TW_CODE = /^[0-9]{4,6}[A-Z]?$/
const US_CODE = /^[A-Z]{1,5}([.-][A-Z]{1,2})?$/

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
