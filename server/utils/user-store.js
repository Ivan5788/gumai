// 使用者資料儲存（收藏、畫線）。
// 目前用 Nitro 的 'data' storage（檔案，.data/kv/）。
// 未來 Spring Boot 上線後，改為呼叫後端 API 即可，端點與前端不需變動。

function safeKey(value) {
  return String(value).replace(/[^a-zA-Z0-9:_-]/g, '_')
}

const store = () => useStorage('data')

export async function readUserData(userId, kind) {
  const value = await store().getItem(`${safeKey(kind)}:${safeKey(userId)}`)
  return value || null
}

export async function writeUserData(userId, kind, value) {
  await store().setItem(`${safeKey(kind)}:${safeKey(userId)}`, value)
  return value
}

export async function removeUserData(userId, kind) {
  await store().removeItem(`${safeKey(kind)}:${safeKey(userId)}`)
}
