<template>
  <div class="app-shell">
    <div class="app-shell__pinned">
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
