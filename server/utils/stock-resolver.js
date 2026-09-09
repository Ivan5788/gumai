import { findMockStock } from './mock-stocks'
import { getTwseDailyCandles, getTwseStockName, getTwseListedCompanies, twseIndustryLabel } from './twse'
import { getYahooMeta } from './yahoo'

const TWSE_ENABLED = process.env.NUXT_TWSE_ENABLED !== 'false'
const YAHOO_ENABLED = process.env.NUXT_YAHOO_ENABLED !== 'false'

const TW_CODE = /^[0-9]{4,6}[A-Z]?$/
const US_CODE = /^[A-Z]{1,5}([.-][A-Z]{1,2})?$/

// 解析任一股票代號 → 股票基本資訊，或 null（找不到）。
// 先查內建清單（含美股與精選台股），再向資料來源確認任意上市 / 美股代號。
export async function resolveStock(symbol) {
  const s = String(symbol || '').trim().toUpperCase()
  if (!s) return null

  const mock = findMockStock(s)
  if (mock) return mock

  // 台股上市
  if (TWSE_ENABLED && TW_CODE.test(s)) {
    try {
      const daily = await getTwseDailyCandles(s, 2)
      if (daily.length) {
        const listed = await getTwseListedCompanies().catch(() => null)
        const info = listed?.get(s)
        return {
          symbol: s,
          market: 'TW',
          listing: 'TWSE',
          name: info?.name || (await getTwseStockName(s)) || s,
          nameEn: null,
          industry: info ? twseIndustryLabel(info.industryCode) : '上市',
          currency: 'TWD',
          previousClose: daily[daily.length - 1].close
        }
      }
    } catch {
      // 落到 null
    }
  }

  // 美股
  if (YAHOO_ENABLED && US_CODE.test(s)) {
    try {
      const meta = await getYahooMeta(s)
      if (meta) {
        return {
          symbol: s,
          market: 'US',
          listing: null,
          name: meta.name || s,
          nameEn: meta.name || s,
          industry: '美股',
          currency: meta.currency || 'USD',
          previousClose: meta.previousClose ?? null
        }
      }
    } catch {
      // 落到 null
    }
  }

  return null
}
