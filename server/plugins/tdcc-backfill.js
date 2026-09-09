import { POOL } from '../utils/stock-pool'
import { resolveStock } from '../utils/stock-resolver'
import { getTdccHistory } from '../utils/tdcc'

// 啟動後緩慢回補股票池近 8 週集保週資料，讓「散戶持股減少」選股條件可用。
// 逐檔、每檔間隔數秒，避免對集保造成負擔。歷史週結算會永久快取，重啟後多為快取命中。
// 預渲染（build）時不執行；計時器 unref，不拖住行程。
export default defineNitroPlugin(() => {
  if (import.meta.prerender) return
  if (process.env.NUXT_TDCC_ENABLED === 'false') return

  let i = 0
  let timer = null

  const next = (ms) => {
    timer = setTimeout(tick, ms)
    timer.unref?.()
  }

  async function tick() {
    const symbol = POOL[i]
    i += 1
    if (!symbol) return // 全部完成

    try {
      const stock = await resolveStock(symbol)
      if (stock && stock.market === 'TW' && stock.listing) {
        await getTdccHistory(stock.symbol, 8)
      }
    } catch {
      // 略過此股
    }
    next(6000)
  }

  next(30000)
})
