// 有限並行度工具。
//
// 逐檔解析股票（resolveStock/resolveQuote 等）大部分時間花在等外部 API 回應，
// 純序列迴圈等於把這些等待時間全部疊加。改用少量並行 worker，讓「等某檔的
// 證交所節流佇列輪到」跟「另一檔的 Yahoo/FinMind 查詢」重疊進行，縮短總時間。
//
// 注意：這不會讓證交所（twse.js 的 throttle）被打得更兇——所有台股 TWSE 請求
// 仍然共用同一條全域節流佇列，這裡只是讓「排隊等待」跟「其他工作」不再互相卡住。

export async function mapLimit(items, limit, fn) {
  const list = Array.from(items)
  const results = new Array(list.length)
  let cursor = 0

  async function worker() {
    while (cursor < list.length) {
      const i = cursor
      cursor += 1
      results[i] = await fn(list[i], i)
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(limit, list.length)) }, worker)
  await Promise.all(workers)
  return results
}
