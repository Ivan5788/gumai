// GET /api/auth/providers — 前端用來決定登入按鈕要顯示 Google、測試用登入，或兩者都顯示。
// 測試登入只看 import.meta.dev（編譯期常數），正式 build 這個分支會被整個排除，
// 不會出現在產出的程式碼裡——不是「執行時用環境變數擋」，是正式環境本來就不存在
// 這條路徑，不會變成可以被外部打到的後門。
export default defineEventHandler(() => {
  return {
    google: Boolean(process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID),
    dev: import.meta.dev
  }
})
