<template>
  <ClientOnly>
    <div class="wl">
      <template v-if="loggedIn">
        <button
          type="button"
          class="wl__star"
          :class="{ 'wl__star--on': isFav }"
          :aria-pressed="isFav"
          @click="store.toggleSymbol(symbol)"
        >
          <span aria-hidden="true">{{ isFav ? '★' : '☆' }}</span>
          {{ isFav ? '已收藏' : '收藏' }}
        </button>

        <details ref="dd" class="wl__dd">
          <summary class="wl__more" aria-label="選擇收藏分類">分類 ▾</summary>
          <div class="wl__panel">
            <p class="wl__panel-title">加入 / 移除分類</p>
            <label v-for="cat in store.categories" :key="cat.id" class="wl__cat">
              <input
                type="checkbox"
                :checked="cat.symbols.includes(normSymbol)"
                @change="store.toggleSymbol(symbol, cat.id)"
              />
              <span>{{ cat.name }}</span>
            </label>
            <form class="wl__add" @submit.prevent="onAddCategory">
              <input v-model="newCat" type="text" placeholder="新增分類…" maxlength="30" />
              <button type="submit" aria-label="新增分類">＋</button>
            </form>
          </div>
        </details>
      </template>

      <template v-else>
        <button type="button" class="wl__star" @click="pokeHint">
          <span aria-hidden="true">☆</span> 收藏
        </button>
        <span v-if="hint" class="wl__hint">請從右上角登入後即可收藏</span>
      </template>
    </div>
  </ClientOnly>
</template>

<script setup>
const props = defineProps({
  symbol: { type: String, required: true }
})

const { loggedIn } = useUserSession()
const store = useWatchlistStore()

const normSymbol = computed(() => normalizeSymbol(props.symbol))
const isFav = computed(() => store.isFavorite(props.symbol))

const hint = ref(false)
let hintTimer = null
function pokeHint() {
  hint.value = true
  clearTimeout(hintTimer)
  hintTimer = setTimeout(() => (hint.value = false), 4000)
}

const newCat = ref('')
function onAddCategory() {
  const name = newCat.value.trim()
  if (!name) return
  const id = store.addCategory(name)
  if (id) store.addSymbol(props.symbol, id)
  newCat.value = ''
}

onBeforeUnmount(() => clearTimeout(hintTimer))
</script>

<style lang="scss" scoped>
.wl {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  flex-wrap: wrap;
}

.wl__star {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.85rem;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  background: transparent;
  color: $color-text-muted;
  font-size: 0.85rem;
  font-weight: 550;
  cursor: pointer;

  &:hover {
    color: $color-text;
  }

  &--on {
    color: #f2c94c;
    border-color: rgba(#f2c94c, 0.5);
  }
}

.wl__dd {
  position: relative;
}

.wl__more {
  padding: 0.4rem 0.7rem;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  color: $color-text-muted;
  font-size: 0.8rem;
  list-style: none;
  cursor: pointer;

  &::-webkit-details-marker {
    display: none;
  }

  &:hover {
    color: $color-text;
  }
}

.wl__panel {
  position: absolute;
  left: 0;
  top: calc(100% + 0.4rem);
  z-index: 30;
  min-width: 12rem;
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding: $space-3;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.wl__panel-title {
  margin: 0;
  color: $color-text-muted;
  font-size: 0.72rem;
}

.wl__cat {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.wl__add {
  display: flex;
  gap: $space-1;
  margin-top: $space-1;

  input {
    flex: 1;
    min-width: 0;
    padding: 0.3rem 0.5rem;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-bg;
    color: $color-text;
    font-size: 0.8rem;
  }

  button {
    padding: 0.3rem 0.6rem;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: transparent;
    color: $color-text;
    cursor: pointer;
  }
}

.wl__hint {
  color: $color-text-muted;
  font-size: 0.78rem;
}
</style>
