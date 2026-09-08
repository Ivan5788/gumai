<template>
  <header class="app-header">
    <div class="app-header__inner">
      <NuxtLink to="/" class="brand" aria-label="StockPulse 首頁">
        <span class="brand__mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="currentColor" opacity="0.14" />
            <path
              d="M6 20.5 11.2 14.8 15.1 18.2 21.4 10.5 26 16.2"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span class="brand__text">
          <span class="brand__name">StockPulse</span>
          <span class="brand__tag">Market Terminal</span>
        </span>
      </NuxtLink>

      <nav class="nav" aria-label="主要導覽">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav__link"
          :class="{ 'nav__link--active': isActive(item) }"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>

<script setup>
const route = useRoute()

const navItems = [
  { label: 'Overview', to: '/', match: 'exact' },
  { label: 'Analysis', to: '/stock', match: 'prefix' },
  { label: 'Screener', to: '/screener', match: 'exact' },
  { label: 'Signals', to: '/signals', match: 'exact' }
]

const isActive = (item) => {
  if (item.match === 'prefix') {
    return route.path === item.to || route.path.startsWith(`${item.to}/`)
  }

  return route.path === item.to
}
</script>

<style lang="scss" scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid $color-border;
  background: rgba($color-bg, 0.92);
  backdrop-filter: blur(12px);
}

.app-header__inner {
  width: min(100%, $layout-max-width);
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  gap: $space-3;
  padding: $space-3 $space-4;

  @include tablet {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: $space-6;
    padding: $space-3 $space-6;
  }
}

.brand {
  display: flex;
  align-items: center;
  gap: $space-3;
  min-width: 0;
  color: $color-text;
  text-decoration: none;
}

.brand__mark {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  color: $color-accent;

  svg {
    display: block;
    width: 100%;
    height: 100%;
  }
}

.brand__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.brand__name {
  font-size: 1.05rem;
  font-weight: 650;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.brand__tag {
  color: $color-text-muted;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nav {
  display: flex;
  align-items: center;
  gap: $space-1;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.nav__link {
  flex-shrink: 0;
  padding: 0.55rem 0.9rem;
  border-radius: $radius-sm;
  color: $color-text-muted;
  font-size: 0.875rem;
  font-weight: 550;
  line-height: 1.2;
  text-decoration: none;
  transition: color 0.15s ease, background-color 0.15s ease;

  &:hover {
    color: $color-text;
    background: $color-surface-hover;
  }

  &:focus-visible {
    outline: 2px solid $color-accent;
    outline-offset: 2px;
  }
}

.nav__link--active {
  color: $color-text;
  background: $color-surface-active;
}
</style>
