// FinMind（開源台股資料 API）。三大法人買賣超一次可取整段區間。
// 免 token 可用（額度較低）；設 NUXT_FINMIND_TOKEN 可提高額度。
// https://finmindtrade.com

const BASE = 'https://api.finmindtrade.com/api/v4/data'
const CACHE_TTL = 60 * 60 * 1000 // 1 小時（三大法人為盤後定案資料）

function isoDaysAgo(days) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

async function finmind(dataset, dataId, startDate) {
  const token = process.env.NUXT_FINMIND_TOKEN
  const res = await $fetch(BASE, {
    params: {
      dataset,
      data_id: dataId,
      ...(startDate ? { start_date: startDate } : {}),
      ...(token ? { token } : {})
    },
    timeout: 15000,
    retry: 0
  })
  if (res?.status !== 200 || !Array.isArray(res.data)) {
    throw new Error(`finmind: ${res?.msg || res?.status || 'unknown'}`)
  }
  return res.data
}

// 股票基本資料（名稱 / 產業 / 市場別）。涵蓋上市、上櫃。
export async function getFinmindStockInfo(stockId) {
  const key = `finmind:info:${stockId}`
  const store = useStorage('data')
  const cached = await store.getItem(key)
  if (cached && Date.now() - cached.at < 7 * 24 * 60 * 60 * 1000) return cached.value

  try {
    const rows = await finmind('TaiwanStockInfo', stockId)
    const r = rows.find((x) => x.stock_name && (x.type === 'twse' || x.type === 'tpex'))
    if (!r) return cached?.value || null
    const value = { name: r.stock_name, industry: r.industry_category || null, type: r.type }
    await store.setItem(key, { at: Date.now(), value })
    return value
  } catch {
    return cached?.value || null
  }
}

// 三大法人買賣超（單位：張），近 ~120 天，回傳 [{ date, foreign, trust, dealer, total }]
export async function getFinmindInstitutional(stockNo) {
  const key = `finmind:inst:${stockNo}`
  const store = useStorage('data')
  const cached = await store.getItem(key)
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.rows

  try {
    const raw = await finmind('TaiwanStockInstitutionalInvestorsBuySell', stockNo, isoDaysAgo(160))
    const byDate = new Map()
    for (const r of raw) {
      const net = (Number(r.buy) - Number(r.sell)) / 1000
      const d = byDate.get(r.date) || { date: r.date, foreign: 0, trust: 0, dealer: 0 }
      if (r.name === 'Foreign_Investor' || r.name === 'Foreign_Dealer_Self') d.foreign += net
      else if (r.name === 'Investment_Trust') d.trust += net
      else if (r.name === 'Dealer_self' || r.name === 'Dealer_Hedging') d.dealer += net
      byDate.set(r.date, d)
    }

    const rows = [...byDate.values()]
      .map((d) => {
        const foreign = Math.round(d.foreign)
        const trust = Math.round(d.trust)
        const dealer = Math.round(d.dealer)
        return { date: d.date, foreign, trust, dealer, total: foreign + trust + dealer }
      })
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

    if (rows.length) await store.setItem(key, { at: Date.now(), rows })
    return rows.length ? rows : cached?.rows || []
  } catch {
    return cached?.rows || []
  }
}
