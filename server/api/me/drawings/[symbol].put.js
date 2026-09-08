import { saveDrawings } from '../../../utils/drawings'

// PUT /api/me/drawings/:symbol — 覆寫該股的畫線（需登入）
export default defineEventHandler(async (event) => {
  const { user } = await requireUserSession(event)
  const symbol = String(getRouterParam(event, 'symbol') || '').trim().toUpperCase()
  const body = await readBody(event)
  setHeader(event, 'Cache-Control', 'no-store')
  return saveDrawings(user.id, symbol, body)
})
