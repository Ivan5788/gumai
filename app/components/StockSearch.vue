<template>
  <div class="stock-search">
    <button
      type="button"
      class="stock-search__toggle"
      :aria-expanded="open"
      aria-label="搜尋個股"
      @click="toggle"
    >
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="9" cy="9" r="6" stroke="currentColor" stroke-width="1.6" />
        <path d="M17 17 13.4 13.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
      <span class="stock-search__toggle-label">搜尋個股</span>
    </button>

    <template v-if="open">
      <div class="stock-search__backdrop" @click="close" />
      <div class="stock-search__panel">
        <form class="stock-search__form" @submit.prevent="onSubmit">
          <input
            ref="inputEl"
            v-model="query"
            type="search"
            inputmode="search"
            placeholder="輸入股票代號或名稱，如 2330、台積電、AAPL"
            autocomplete="off"
            @keydown.down.prevent="move(1)"
            @keydown.up.prevent="move(-1)"
            @keydown.esc="close"
          />
          <button type="submit" aria-label="查詢">查詢</button>
        </form>

        <ul v-if="items.length || directMatch" class="stock-search__results">
          <li v-for="(r, i) in items" :key="r.symbol">
            <NuxtLink
              :to="`/stock/${r.symbol}`"
              :class="{ 'is-active': i === activeIndex }"
              @click="close"
            >
              <span class="stock-search__name">{{ r.name }}</span>
              <span class="stock-search__meta">{{ r.symbol }} · {{ r.market === 'TW' ? '台股' : '美股' }}</span>
            </NuxtLink>
          </li>
          <li v-if="directMatch">
            <NuxtLink :to="`/stock/${directMatch.symbol}`" class="stock-search__direct" @click="close">
              前往「{{ directMatch.symbol }}」›
            </NuxtLink>
          </li>
        </ul>
        <p v-else-if="query.trim() && !pending" class="stock-search__empty">
          查無符合的股票，可直接輸入完整代號查詢。
        </p>
      </div>
    </template>
  </div>
</template>

<script setup>
const { client } = useApi()

const open = ref(false)
const query = ref('')
const items = ref([])
const directMatch = ref(null)
const pending = ref(false)
const activeIndex = ref(-1)
const inputEl = ref(null)

let debounceTimer = null
let requestId = 0

watch(query, (q) => {
  clearTimeout(debounceTimer)
  activeIndex.value = -1
  if (!q.trim()) {
    items.value = []
    directMatch.value = null
    pending.value = false
    return
  }
  pending.value = true
  debounceTimer = setTimeout(async () => {
    const id = ++requestId
    try {
      const data = await client('/stocks/search', { params: { q } })
      if (id !== requestId) return
      items.value = data.items || []
      directMatch.value = data.directMatch || null
    } catch {
      if (id !== requestId) return
      items.value = []
      directMatch.value = null
    } finally {
      if (id === requestId) pending.value = false
    }
  }, 200)
})

function toggle() {
  open.value = !open.value
  if (open.value) nextTick(() => inputEl.value?.focus())
  else reset()
}

function close() {
  open.value = false
  reset()
}

function reset() {
  query.value = ''
  items.value = []
  directMatch.value = null
  activeIndex.value = -1
}

function move(dir) {
  const max = items.value.length - 1
  if (max < 0) return
  activeIndex.value = Math.min(max, Math.max(0, activeIndex.value + dir))
}

async function onSubmit() {
  const picked = items.value[activeIndex.value] ?? items.value[0]
  if (picked) {
    close()
    await navigateTo(`/stock/${picked.symbol}`)
    return
  }
  const normalized = normalizeSymbol(query.value)
  if (isValidSymbol(normalized)) {
    close()
    await navigateTo(`/stock/${normalized}`)
  }
}

onBeforeUnmount(() => clearTimeout(debounceTimer))
</script>

<style lang="scss" scoped>
.stock-search {
  position: relative;
  flex-shrink: 0;
}

.stock-search__toggle {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  padding: 0.4rem 0.7rem;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  background: transparent;
  color: $color-text;
  font-size: 0.85rem;
  font-weight: 550;
  cursor: pointer;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
    width: 1.05rem;
    height: 1.05rem;
    color: $color-text-muted;
  }

  &:hover {
    background: $color-surface-hover;
  }

  &:focus-visible {
    outline: 2px solid $color-accent;
    outline-offset: 2px;
  }
}

.stock-search__toggle-label {
  @media (max-width: 480px) {
    display: none;
  }
}

.stock-search__backdrop {
  position: fixed;
  inset: 0;
  z-index: 29;
}

.stock-search__panel {
  position: absolute;
  right: 0;
  top: calc(100% + 0.4rem);
  z-index: 30;
  width: min(92vw, 22rem);
  display: flex;
  flex-direction: column;
  padding: $space-3;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.stock-search__form {
  display: flex;
  gap: $space-2;

  input {
    flex: 1;
    min-width: 0;
    padding: 0.5rem 0.7rem;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-bg;
    color: $color-text;
    font-size: 0.9rem;

    &:focus-visible {
      outline: 2px solid $color-accent;
      outline-offset: 1px;
    }
  }

  button {
    flex-shrink: 0;
    padding: 0.5rem 0.9rem;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-surface-active;
    color: $color-text;
    font-size: 0.85rem;
    font-weight: 550;
    cursor: pointer;

    &:hover {
      border-color: $color-accent;
    }
  }
}

.stock-search__results {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin: $space-3 0 0;
  padding: 0;
  list-style: none;
  max-height: 18rem;
  overflow-y: auto;

  a {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: $space-3;
    padding: 0.55rem 0.6rem;
    border-radius: $radius-sm;
    color: $color-text;
    text-decoration: none;

    &:hover,
    &.is-active {
      background: $color-surface-hover;
    }
  }
}

.stock-search__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.88rem;
  font-weight: 550;
}

.stock-search__meta {
  flex-shrink: 0;
  color: $color-text-muted;
  font-size: 0.76rem;
  white-space: nowrap;
}

.stock-search__direct {
  justify-content: flex-start !important;
  color: $color-accent !important;
  font-size: 0.85rem;
}

.stock-search__empty {
  margin: $space-3 0 0;
  color: $color-text-muted;
  font-size: 0.82rem;
}
</style>
