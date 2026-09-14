// 簡易 IP 節流（記憶體內、單一 process 有效）。
// 目的：防止對 /api/** 的大量/自動化請求灌爆本站，尤其是會觸發外部請求
// （證交所／Yahoo／FinMind／集保）的個股代號解析端點——見資安檢視。
// 多副本部署（水平擴展）要做到跨副本節流，需改用共用儲存（Redis 等），
// 這裡先解決單機/單一部署最常見也最直接的濫用情境。

// 依路徑前綴給不同的節流規則：越接近「會打外部 API」的端點越嚴格。
//
// /api/stocks/** 的上限訂得比較寬鬆（100），是吃過一次虧調的：個股連結多的頁面
// （如大型權值股完整清單，最多 83 檔）被使用者一次捲動整頁時，NuxtLink 的
// viewport 預抓（prefetch）會在幾秒內對每個連結各打一次 /stock/:symbol/_payload.json，
// 該渲染內部又各自呼叫一次 /api/stocks/:symbol——是正常瀏覽行為，不是濫用。
// 已把那些股票清單的 NuxtLink 改成 prefetch-on="interaction"（滑過/聚焦才預抓，
// 不會整頁一捲就全部打），這裡的上限只是保留合理餘裕，真正擋濫用的是
// stock-resolver.js 的查無資料負面快取——同一個假代號不會被重複打好幾次。
const RULES = [
  { test: (p) => p.startsWith('/api/stocks/search'), windowMs: 10_000, max: 20 },
  { test: (p) => p.startsWith('/api/stocks/'), windowMs: 10_000, max: 100 },
  { test: (p) => p.startsWith('/api/market/'), windowMs: 10_000, max: 30 },
  { test: (p) => p.startsWith('/api/me/'), windowMs: 10_000, max: 30 },
  { test: (p) => p.startsWith('/api/'), windowMs: 10_000, max: 60 }
]

const buckets = new Map() // `${ip}:${ruleIndex}` -> { count, resetAt }
let sinceSweep = 0

function sweep(now) {
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
  }
}

export function pickRateLimitRule(path) {
  const idx = RULES.findIndex((r) => r.test(path))
  return idx === -1 ? null : idx
}

// 回傳 null 表示放行；否則回傳 { retryAfterSeconds }
export function checkRateLimit(ip, path) {
  const idx = pickRateLimitRule(path)
  if (idx === null) return null

  const now = Date.now()
  // 機率性清掃過期 bucket，避免長時間運行下 Map 無限增長
  sinceSweep += 1
  if (sinceSweep >= 500) {
    sinceSweep = 0
    sweep(now)
  }

  const rule = RULES[idx]
  const key = `${ip || 'unknown'}:${idx}`
  let bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + rule.windowMs }
    buckets.set(key, bucket)
  }
  bucket.count += 1

  if (bucket.count > rule.max) {
    return { retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }
  return null
}
