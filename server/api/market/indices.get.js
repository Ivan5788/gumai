import { getMarketIndices } from '../../utils/market-index'

// GET /api/market/indices — 台股大盤指數（加權 / 櫃買），官方盤後資料。
export default defineEventHandler(async (event) => {
  // 盤後資料，可短快取；瀏覽器端每分鐘會自行刷新
  setHeader(event, 'Cache-Control', 'public, max-age=60, stale-while-revalidate=600')
  return getMarketIndices()
})
