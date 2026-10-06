<template>
  <div class="app-shell">
    <div ref="pinnedEl" class="app-shell__pinned">
      <TestNotice />
      <AppHeader />
    </div>
    <main class="app-shell__main">
      <div class="app-shell__content">
        <slot />
      </div>
    </main>
    <AppFooter />
    <ClientOnly>
      <BackToTop />
    </ClientOnly>
  </div>
</template>

<script setup>
// 警語 + 頁首置頂區塊的實際高度會隨文字換行/視窗寬度變動，透過 CSS 變數讓頁面
// 內自己的 sticky 區塊（例如個股頁的股價迷你列）知道要往下讓出多少空間，
// 不用各自猜一個寫死的像素值。
const pinnedEl = ref(null)
let observer = null

onMounted(() => {
  if (!pinnedEl.value || typeof ResizeObserver === 'undefined') return
  const setHeight = () => {
    document.documentElement.style.setProperty('--pinned-height', `${pinnedEl.value.offsetHeight}px`)
  }
  observer = new ResizeObserver(setHeight)
  observer.observe(pinnedEl.value)
  setHeight()
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<style lang="scss" scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: $color-bg;
}

.app-shell__pinned {
  position: sticky;
  top: 0;
  z-index: 20;
}

.app-shell__main {
  flex: 1;
  width: 100%;
}

.app-shell__content {
  width: min(100%, $layout-max-width);
  margin-inline: auto;
  padding: $space-4 $space-4 $space-8;

  @include desktop {
    padding: $space-6 $space-6 $space-10;
  }
}
</style>
