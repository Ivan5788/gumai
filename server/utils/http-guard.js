// 共用的請求防護小工具（見資安檢視）。

// 遠大於實際會用到的收藏/畫線資料（裁切後頂多幾十 KB），但足以擋下濫用的大型請求，
// 避免 readBody 在裁切邏輯生效前就先把一個很大的 body 整個解析進記憶體。
// content-length 可能被偽造或省略（chunked），這裡只做第一道防線，非唯一防護。
const MAX_BODY_BYTES = 256 * 1024

export function assertReasonableBodySize(event, maxBytes = MAX_BODY_BYTES) {
  const len = Number(getRequestHeader(event, 'content-length') || 0)
  if (len > maxBytes) {
    throw createError({ statusCode: 413, statusMessage: 'Payload Too Large', message: '請求內容過大。' })
  }
}
