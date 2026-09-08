import { saveWatchlist } from '../../utils/watchlist'

// PUT /api/me/watchlist — 覆寫目前使用者的收藏（需登入）
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const body = await readBody(event)
  setHeader(event, 'Cache-Control', 'no-store')
  return saveWatchlist(user.id, body)
})
