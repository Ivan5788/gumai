import { ensureFreshSnapshot } from '../utils/pool-snapshot'

// 啟動後預熱股票池指標快照（前一交易日收盤為準）。
// 之後每 5 分鐘檢查一次是否到了尾盤重抓時間點（13:00／13:15，見 pool-snapshot.js 的
// dueIntradaySlot）——選股/訊號規則本身不吃連續即時報價，其餘時間不會重建快照。
// 預渲染（build）時不執行，且計時器 unref，避免拖住行程結束。
export default defineNitroPlugin(() => {
  if (import.meta.prerender) return

  const warm = setTimeout(ensureFreshSnapshot, 4000)
  const refresh = setInterval(ensureFreshSnapshot, 5 * 60 * 1000)
  warm.unref?.()
  refresh.unref?.()
})
