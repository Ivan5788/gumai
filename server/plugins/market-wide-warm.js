import { ensureMarketWideSnapshot } from '../utils/market-wide'

// 啟動後回補全市場技術面快照（上市約 30 個交易日歷史，一次性、背景執行，
// 不擋伺服器啟動）。之後每 10 分鐘檢查一次是否到了當天 15:00（台北時間）的
// 補資料時間點——兩邊交易所這時通常都已結算完當天資料，一天只補一次。
// 預渲染（build）時不執行，且計時器 unref，避免拖住行程結束。
export default defineNitroPlugin(() => {
  if (import.meta.prerender) return

  const warm = setTimeout(ensureMarketWideSnapshot, 6000)
  const refresh = setInterval(ensureMarketWideSnapshot, 10 * 60 * 1000)
  warm.unref?.()
  refresh.unref?.()
})
