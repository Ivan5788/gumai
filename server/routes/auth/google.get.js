// GET /auth/google — Google OAuth 登入流程。
// 需環境變數 NUXT_OAUTH_GOOGLE_CLIENT_ID / NUXT_OAUTH_GOOGLE_CLIENT_SECRET。
// Google Cloud Console 的「授權重新導向 URI」需包含： <站台網址>/auth/google
export default defineOAuthGoogleEventHandler({
  config: {
    scope: ['email', 'profile']
  },

  async onSuccess(event, { user }) {
    await setUserSession(event, {
      user: {
        id: `google:${user.sub}`,
        name: user.name,
        email: user.email,
        avatar: user.picture,
        provider: 'google'
      },
      loggedInAt: new Date().toISOString()
    })
    return sendRedirect(event, '/')
  },

  onError(event, error) {
    console.error('[auth] Google OAuth 失敗', error)
    return sendRedirect(event, '/?login=error')
  }
})
