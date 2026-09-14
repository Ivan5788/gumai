// 正式環境啟動檢查：NUXT_SESSION_PASSWORD 是否有設定、長度是否足夠（見資安檢視）。
// 開發模式下 nuxt-auth-utils 會自動產生一組寫進 .env；但那段邏輯在正式建置（import.meta.dev
// 為 false）時是編譯期關掉的——忘記在正式環境設定的話，session 密碼會是空字串，不安全。
// 這裡只負責大聲提醒（寫進伺服器 log），不阻斷啟動。
export default defineNitroPlugin(() => {
  if (import.meta.dev || import.meta.prerender) return

  const pw = process.env.NUXT_SESSION_PASSWORD || ''
  if (pw.length < 32) {
    console.error(
      '[security] NUXT_SESSION_PASSWORD 未設定或長度不足 32 字元。' +
        '正式環境務必設定足夠長度（≥32 字元）的隨機字串，否則登入 session 不安全，請盡快修正。'
    )
  }
})
