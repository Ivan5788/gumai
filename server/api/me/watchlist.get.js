import { getWatchlist } from '../../utils/watchlist'

// GET /api/me/watchlist — 目前使用者的收藏（需登入）
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  setHeader(event, 'Cache-Control', 'no-store')
  return getWatchlist(user.id)
})
