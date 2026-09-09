import { getIndexHistory } from '../../../utils/market-index'

// GET /api/market/:code/history?interval=1d|1wk|60m — 大盤指數走勢（加權 / 櫃買）
export default defineEventHandler(async (event) => {
  const code = String(getRouterParam(event, 'code') || '').trim().toUpperCase()
  const { interval } = getQuery(event)

  const res = await getIndexHistory(code, interval)
  if (!res) {
    throw createError({ statusCode: 404, message: `找不到指數 ${code}` })
  }

  setHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=1800')
  return res
})
