import { ensureFreshSnapshot } from '../utils/pool-snapshot'

// 啟動後預熱股票池指標快照，並定期刷新。
// 預渲染（build）時不執行，且計時器 unref，避免拖住行程結束。
export default defineNitroPlugin(() => {
  if (import.meta.prerender) return

  const warm = setTimeout(ensureFreshSnapshot, 4000)
  const refresh = setInterval(ensureFreshSnapshot, 3 * 60 * 60 * 1000)
  warm.unref?.()
  refresh.unref?.()
})
