// 依登入狀態載入 / 清空使用者收藏。
export default defineNuxtPlugin(() => {
  const { loggedIn } = useUserSession()
  const store = useWatchlistStore()

  watch(
    loggedIn,
    (isLoggedIn) => {
      if (isLoggedIn) store.load()
      else store.reset()
    },
    { immediate: true }
  )
})
