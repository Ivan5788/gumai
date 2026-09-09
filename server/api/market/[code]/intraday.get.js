import { getIndexIntraday } from '../../../utils/market-index'

// GET /api/market/:code/intraday — 大盤指數當日走勢（目前僅加權指數提供）
export default defineEventHandler(async (event) => {
  const code = String(getRouterParam(event, 'code') || '').trim().toUpperCase()

  const res = await getIndexIntraday(code)
  if (!res) {
    throw createError({ statusCode: 404, message: `找不到指數 ${code}` })
  }

  setHeader(event, 'Cache-Control', 'no-store')
  return res
})
