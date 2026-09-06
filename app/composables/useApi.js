// 統一的 API 存取層。
//
// 目前後端為本地 Nitro mock（server/api/**），因此 SSR 與瀏覽器端都走同源 /api。
// 未來整合 Spring Boot 後：
//   - 瀏覽器端維持呼叫 /api，由 Nitro routeRules 代理到後端
//   - SSR / prerender 可改用 config.apiBase 直接呼叫後端內網位址
// 屆時只需調整這個檔案，頁面與 store 不受影響。

export function useApi() {
  const config = useRuntimeConfig()
  const baseURL = config.public.apiBase

  const client = $fetch.create({
    baseURL,
    onResponseError({ request, response }) {
      if (import.meta.dev) {
        console.error('[api] 請求失敗', String(request), response.status, response._data)
      }
    }
  })

  return { client, baseURL }
}

// SSR 友善的資料抓取：包裝 useFetch，套用 API baseURL 與去重 key。
// 頁面用這個抓「可被搜尋引擎索引」的資料（基本資訊、歷史等）。
export function useApiFetch(path, options = {}) {
  const { baseURL } = useApi()

  return useFetch(path, {
    baseURL,
    ...options
  })
}
