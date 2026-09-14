import { saveWatchlist } from '../../utils/watchlist'
import { assertReasonableBodySize } from '../../utils/http-guard'

// PUT /api/me/watchlist — 覆寫目前使用者的收藏（需登入）
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  assertReasonableBodySize(event)
  const body = await readBody(event)
  setHeader(event, 'Cache-Control', 'no-store')
  return saveWatchlist(user.id, body)
})
