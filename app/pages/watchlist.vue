<template>
  <article class="page">
    <header class="page__intro">
      <p class="eyebrow">Watchlist</p>
      <h1>我的收藏</h1>
    </header>

    <ClientOnly>
      <p v-if="!loggedIn" class="wl-state">請先從右上角登入，才能使用收藏功能。</p>
      <p v-else-if="!store.loaded" class="wl-state">載入中…</p>

      <div v-else class="wl-page">
        <div class="wl-page__cats">
          <button
            v-for="cat in store.categories"
            :key="cat.id"
            type="button"
            class="wl-tab"
            :class="{ 'wl-tab--active': cat.id === store.activeCategoryId }"
            @click="store.setActiveCategory(cat.id)"
          >
            {{ cat.name }}
            <span class="wl-tab__count">{{ cat.symbols.length }}</span>
          </button>
          <form class="wl-add" @submit.prevent="onAddCategory">
            <input v-model="newCat" type="text" placeholder="新增分類…" maxlength="30" />
            <button type="submit">新增</button>
          </form>
        </div>

        <section v-if="active" class="wl-cat">
          <header class="wl-cat__head">
            <template v-if="editing">
              <input
                ref="renameInput"
                v-model="editName"
                class="wl-cat__rename"
                maxlength="30"
                @keyup.enter="commitRename"
                @blur="commitRename"
              />
            </template>
            <h2 v-else>{{ active.name }}</h2>

            <div class="wl-cat__actions">
              <span v-if="store.syncing" class="wl-cat__sync">同步中…</span>
              <button type="button" @click="startRename">重新命名</button>
              <button
                v-if="store.categories.length > 1"
                type="button"
                class="wl-cat__danger"
                @click="removeCategory"
              >
                刪除分類
              </button>
            </div>
          </header>

          <p v-if="!active.symbols.length" class="wl-state">
            這個分類還沒有股票。到個股頁點「收藏」，或在下方輸入代號加入。
          </p>

          <div v-else class="wl-table-wrap">
            <table class="wl-table">
              <thead>
                <tr>
                  <th scope="col">代號</th>
                  <th scope="col">名稱</th>
                  <th scope="col">現價</th>
                  <th scope="col">漲跌</th>
                  <th scope="col" aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                <tr v-for="sym in active.symbols" :key="sym">
                  <th scope="row">
                    <NuxtLink :to="`/stock/${sym}`">{{ sym }}</NuxtLink>
                  </th>
                  <td>{{ quoteMap[sym]?.name ?? '—' }}</td>
                  <td>{{ quoteMap[sym] ? formatPrice(quoteMap[sym].price) : '—' }}</td>
                  <td :class="trendClass(quoteMap[sym]?.change)">
                    <template v-if="quoteMap[sym]">
                      {{ formatSigned(quoteMap[sym].change) }}（{{ formatPercent(quoteMap[sym].changePercent) }}）
                    </template>
                    <template v-else>—</template>
                  </td>
                  <td class="wl-table__op">
                    <button type="button" @click="store.removeSymbol(sym, active.id)">移除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <form class="wl-add wl-add--symbol" @submit.prevent="onAddSymbol">
            <input v-model="newSymbol" type="text" placeholder="輸入代號加入，例如 2330、NVDA" />
            <button type="submit">加入</button>
          </form>
          <p v-if="addError" class="wl-add__error">{{ addError }}</p>
        </section>
      </div>
    </ClientOnly>
  </article>
</template>

<script setup>
const { loggedIn } = useUserSession()
const store = useWatchlistStore()

onMounted(() => {
  if (loggedIn.value && !store.loaded) store.load()
})

const active = computed(() => store.activeCategory)

// ── 報價 ──
const quoteMap = ref({})
async function loadQuotes() {
  const syms = store.allSymbols
  if (!syms.length) {
    quoteMap.value = {}
    return
  }
  try {
    const { quotes } = await $fetch(`/api/quotes?symbols=${syms.join(',')}`)
    quoteMap.value = Object.fromEntries(quotes.map((q) => [q.symbol, q]))
  } catch {
    /* 保留現有 */
  }
}
watch(() => store.allSymbols.join(','), loadQuotes, { immediate: true })

// ── 分類 ──
const newCat = ref('')
function onAddCategory() {
  const name = newCat.value.trim()
  if (!name) return
  const id = store.addCategory(name)
  if (id) store.setActiveCategory(id)
  newCat.value = ''
}

const editing = ref(false)
const editName = ref('')
const renameInput = ref(null)
function startRename() {
  editName.value = active.value?.name ?? ''
  editing.value = true
  nextTick(() => renameInput.value?.focus())
}
function commitRename() {
  if (!editing.value) return
  editing.value = false
  const name = editName.value.trim()
  if (name && name !== active.value?.name) store.renameCategory(active.value.id, name)
}
function removeCategory() {
  if (active.value) store.removeCategory(active.value.id)
}

// ── 加入代號 ──
const newSymbol = ref('')
const addError = ref('')
function onAddSymbol() {
  addError.value = ''
  const raw = normalizeSymbol(newSymbol.value)
  if (!raw) return
  if (!isValidSymbol(raw)) {
    addError.value = '代號格式看起來不正確'
    return
  }
  store.addSymbol(raw, active.value.id)
  newSymbol.value = ''
}

function trendClass(change) {
  const t = trendOf(change)
  return t === 'up' ? 'is-up' : t === 'down' ? 'is-down' : ''
}

const title = '我的收藏 | 股脈'
usePageSeo({ title, description: '管理你的自選股與收藏分類。', path: '/watchlist' })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: $space-6;
}

.page__intro h1 {
  margin: $space-2 0 0;
  font-size: clamp(1.5rem, 2.2vw, 2rem);
  font-weight: 650;
  letter-spacing: -0.03em;
}

.wl-state {
  padding: $space-6 $space-5;
  border: 1px dashed $color-border;
  border-radius: $radius-md;
  color: $color-text-muted;
  font-size: 0.9rem;
}

.wl-page {
  display: flex;
  flex-direction: column;
  gap: $space-5;
}

.wl-page__cats {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
  align-items: center;
}

.wl-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.85rem;
  border: 1px solid $color-border;
  border-radius: 999px;
  background: transparent;
  color: $color-text-muted;
  font-size: 0.85rem;
  cursor: pointer;

  &:hover {
    color: $color-text;
  }

  &--active {
    background: $color-surface-active;
    color: $color-text;
    border-color: transparent;
  }
}

.wl-tab__count {
  font-size: 0.72rem;
  color: $color-text-muted;
}

.wl-add {
  display: flex;
  gap: $space-1;

  input {
    min-width: 0;
    padding: 0.35rem 0.6rem;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-bg;
    color: $color-text;
    font-size: 0.82rem;
  }

  button {
    padding: 0.35rem 0.8rem;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: transparent;
    color: $color-text;
    font-size: 0.82rem;
    cursor: pointer;

    &:hover {
      background: $color-surface-hover;
    }
  }

  &--symbol {
    max-width: 24rem;
  }
}

.wl-add__error {
  color: $color-negative;
  font-size: 0.8rem;
}

.wl-cat {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.wl-cat__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;

  h2 {
    font-size: 1.05rem;
    font-weight: 650;
  }
}

.wl-cat__rename {
  padding: 0.35rem 0.6rem;
  border: 1px solid $color-accent;
  border-radius: $radius-sm;
  background: $color-bg;
  color: $color-text;
  font-size: 1rem;
}

.wl-cat__actions {
  display: flex;
  align-items: center;
  gap: $space-2;

  button {
    padding: 0.3rem 0.7rem;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: transparent;
    color: $color-text-muted;
    font-size: 0.78rem;
    cursor: pointer;

    &:hover {
      color: $color-text;
    }
  }
}

.wl-cat__danger:hover {
  color: $color-negative !important;
}

.wl-cat__sync {
  color: $color-text-muted;
  font-size: 0.75rem;
}

.wl-table-wrap {
  overflow-x: auto;
  border: 1px solid $color-border;
  border-radius: $radius-md;
}

.wl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;

  th,
  td {
    padding: 0.65rem 0.9rem;
    text-align: right;
    white-space: nowrap;
  }

  thead th {
    background: $color-surface-active;
    color: $color-text-muted;
    font-weight: 600;
  }

  th[scope='row'],
  td:nth-child(2) {
    text-align: left;
  }

  th[scope='row'] a {
    color: $color-accent;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  tbody tr:nth-child(even) {
    background: $color-surface;
  }
}

.wl-table__op {
  text-align: center;

  button {
    padding: 0.2rem 0.6rem;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: transparent;
    color: $color-text-muted;
    font-size: 0.78rem;
    cursor: pointer;

    &:hover {
      color: $color-negative;
    }
  }
}

.is-up {
  color: $color-up;
}

.is-down {
  color: $color-down;
}
</style>
