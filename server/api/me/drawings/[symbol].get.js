import { getDrawings } from '../../../utils/drawings'

// GET /api/me/drawings/:symbol — 目前使用者在該股 K 線上的畫線（需登入）
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()
  setHeader(event, 'Cache-Control', 'no-store')
  return getDrawings(user.id, symbol)
})
