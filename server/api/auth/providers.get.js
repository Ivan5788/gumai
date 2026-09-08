// GET /api/auth/providers — 前端用來決定登入按鈕要顯示 Google 還是開發用假登入。
export default defineEventHandler(() => {
  const googleConfigured = Boolean(process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID)
  return {
    google: googleConfigured,
    dev: import.meta.dev && !googleConfigured
  }
})
