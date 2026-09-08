// POST /api/auth/dev-login — 開發用假登入。
// 僅在 dev 模式、且未設定 Google OAuth 憑證時可用，方便在沒有 Google 設定時測試使用者功能。
export default defineEventHandler(async (event) => {
  if (!import.meta.dev || process.env.NUXT_OAUTH_GOOGLE_CLIENT_ID) {
    throw createError({ statusCode: 403, statusMessage: '假登入僅限開發模式且未設定 Google OAuth 時使用' })
  }

  await setUserSession(event, {
    user: {
      id: 'dev:local',
      name: '開發使用者',
      email: 'dev@stockpulse.local',
      avatar: null,
      provider: 'dev'
    },
    loggedInAt: new Date().toISOString()
  })

  return { ok: true }
})
