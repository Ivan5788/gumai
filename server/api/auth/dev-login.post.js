// POST /api/auth/dev-login — 測試用假登入，跟 Google 登入並存，方便開發時不用每次
// 都走一次 Google OAuth 流程。唯一的安全邊界是 import.meta.dev：這是編譯期常數，
// `npm run build` 的正式產出裡這個 if 會直接變成 true、整支函式等同只會丟 403，
// 不是看環境變數之類「執行時」才擋掉的，所以不會因為正式環境忘記設某個變數
// 就意外開放，也不會有人從外部呼叫到這支 API 做出任何事。
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 403, statusMessage: '測試登入僅限開發模式使用' })
  }

  await setUserSession(event, {
    user: {
      id: 'dev:local',
      name: '測試使用者',
      email: 'dev@stockpulse.local',
      avatar: null,
      provider: 'dev'
    },
    loggedInAt: new Date().toISOString()
  })

  return { ok: true }
})
