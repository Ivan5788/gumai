<template>
  <article class="page">
    <header class="page__intro">
      <p class="eyebrow">Signal Scanner</p>
      <h1>關鍵訊號搜尋</h1>
      <p class="lede">
        掃描台股與美股近期「剛發生」的技術面與籌碼面訊號，例如站上季線、黃金交叉、創新高、帶量上漲、跳空、外資翻多、大戶買賣力翻紅等。
        可用股票代號、名稱或訊號關鍵字搜尋。
      </p>
    </header>

    <div class="signals">
      <form class="signals__controls" role="search" @submit.prevent>
        <input
          v-model="qInput"
          type="search"
          class="signals__search"
          placeholder="搜尋：台積電、2330、黃金交叉、外資…"
          aria-label="搜尋股票或訊號"
        />

        <div class="signals__filters">
          <div class="seg" role="group" aria-label="期間">
            <button
              v-for="opt in dayOptions"
              :key="opt.id"
              type="button"
              :class="{ 'is-active': days === opt.id }"
              @click="days = opt.id"
            >
              {{ opt.label }}
            </button>
          </div>
          <div class="seg" role="group" aria-label="市場">
            <button
              v-for="opt in marketOptions"
              :key="opt.id"
              type="button"
              :class="{ 'is-active': market === opt.id }"
              @click="market = opt.id"
            >
              {{ opt.label }}
            </button>
          </div>
          <div class="seg" role="group" aria-label="方向">
            <button
              v-for="opt in directionOptions"
              :key="opt.id"
              type="button"
              :class="{ 'is-active': direction === opt.id }"
              @click="direction = opt.id"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="signals__chips">
          <button
            v-for="sig in SIGNAL_META"
            :key="sig.id"
            type="button"
            class="chip"
            :class="{ 'chip--on': selectedTypes.includes(sig.id), [`chip--${sig.direction}`]: selectedTypes.includes(sig.id) }"
            :title="sig.hint"
            @click="toggleType(sig.id)"
          >
            {{ sig.label }}
          </button>
          <button v-if="selectedTypes.length" type="button" class="chip chip--clear" @click="selectedTypes = []">
            清除
          </button>
        </div>
      </form>

      <section class="signals__feed" aria-label="訊號列表">
        <header class="signals__feed-head">
          <h2>近期訊號</h2>
          <p v-if="!pending">共 {{ data?.count ?? 0 }} 筆（近 {{ days }} 個交易日）</p>
        </header>

        <p v-if="pending" class="signals__state">搜尋中…</p>
        <p v-else-if="error" class="signals__state">訊號服務暫時無法使用。</p>
        <p v-else-if="!data?.events.length" class="signals__state">沒有符合的訊號。</p>

        <div v-else class="signals__table-wrap">
          <table class="signals__table">
            <thead>
              <tr>
                <th scope="col">日期</th>
                <th scope="col">代號</th>
                <th scope="col">名稱</th>
                <th scope="col">市場</th>
                <th scope="col">訊號</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(ev, idx) in data.events" :key="`${ev.date}-${ev.symbol}-${ev.signalId}-${idx}`">
                <th scope="row">{{ ev.date }}</th>
                <td>
                  <NuxtLink :to="`/stock/${ev.symbol}`">{{ ev.symbol }}</NuxtLink>
                </td>
                <td>{{ ev.name }}</td>
                <td>{{ ev.market === 'TW' ? '台股' : '美股' }}</td>
                <td>
                  <span class="tag" :class="`tag--${ev.direction}`">{{ ev.label }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="signals__note">{{ poolNote }}</p>
      </section>
    </div>
  </article>
</template>

<script setup>
const qInput = ref('')
const q = ref('')
const days = ref(10)
const market = ref('ALL')
const direction = ref('all')
const selectedTypes = ref([])

const dayOptions = [
  { id: 5, label: '近 5 日' },
  { id: 10, label: '近 10 日' },
  { id: 20, label: '近 20 日' }
]
const marketOptions = [
  { id: 'ALL', label: '全部' },
  { id: 'TW', label: '台股' },
  { id: 'US', label: '美股' }
]
const directionOptions = [
  { id: 'all', label: '全部' },
  { id: 'bullish', label: '偏多' },
  { id: 'bearish', label: '偏空' }
]

let debounceTimer = null
watch(qInput, (val) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    q.value = val.trim()
  }, 300)
})
onBeforeUnmount(() => clearTimeout(debounceTimer))

function toggleType(id) {
  selectedTypes.value = selectedTypes.value.includes(id)
    ? selectedTypes.value.filter((t) => t !== id)
    : [...selectedTypes.value, id]
}

const requestUrl = computed(() => {
  const params = new URLSearchParams()
  if (q.value) params.set('q', q.value)
  params.set('days', String(days.value))
  if (market.value !== 'ALL') params.set('market', market.value)
  if (direction.value !== 'all') params.set('direction', direction.value)
  if (selectedTypes.value.length) params.set('types', selectedTypes.value.join(','))
  return `/signals?${params.toString()}`
})

const { data, status, error } = await useApiFetch(requestUrl, {
  key: () => `signals${requestUrl.value}`
})

const pending = computed(() => status.value === 'pending' && !data.value)

const poolNote = computed(() => {
  if (data.value?.source === 'live') {
    return `掃描 ${data.value.poolSize} 檔台股權值股與熱門美股，於盤後更新（大戶買賣力訊號仍為示範）。`
  }
  return '指標快照建立中，暫時顯示示範資料，稍後重新整理即為實際資料。'
})

const title = '關鍵訊號搜尋｜黃金交叉、突破、外資翻多 | StockPulse'
const description =
  'StockPulse 關鍵訊號搜尋，掃描台股與美股近期站上均線、黃金交叉、創新高、帶量上漲、跳空、外資翻多與大戶買賣力訊號。'
const { url, siteUrl } = usePageSeo({ title, description, path: '/signals' })
useWebPageJsonLd({
  name: title,
  description,
  url,
  extra: [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首頁', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: '關鍵訊號搜尋', item: url.value }
      ]
    }
  ]
})
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: $space-6;
}

.page__intro h1 {
  margin: $space-2 0 $space-3;
  font-size: clamp(1.5rem, 2.2vw, 2rem);
  font-weight: 650;
  letter-spacing: -0.03em;
}

.lede {
  max-width: 44rem;
  color: $color-text-muted;
  font-size: 0.98rem;
  line-height: 1.65;
}

.signals {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.signals__controls {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  padding: $space-5;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;
}

.signals__search {
  width: 100%;
  padding: 0.6rem 0.9rem;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  background: $color-bg;
  color: $color-text;
  font-size: 0.95rem;

  &:focus-visible {
    outline: 2px solid $color-accent;
    outline-offset: 1px;
  }
}

.signals__filters {
  display: flex;
  flex-wrap: wrap;
  gap: $space-3;
}

.seg {
  display: flex;
  gap: $space-1;
  padding: $space-1;
  border: 1px solid $color-border;
  border-radius: $radius-sm;

  button {
    padding: 0.35rem 0.75rem;
    border: 0;
    border-radius: calc(#{$radius-sm} - 0.15rem);
    background: transparent;
    color: $color-text-muted;
    font-size: 0.82rem;
    font-weight: 550;
    cursor: pointer;

    &:hover {
      color: $color-text;
    }

    &.is-active {
      background: $color-surface-active;
      color: $color-text;
    }
  }
}

.signals__chips {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
}

.chip {
  padding: 0.3rem 0.7rem;
  border: 1px solid $color-border;
  border-radius: 999px;
  background: transparent;
  color: $color-text-muted;
  font-size: 0.78rem;
  cursor: pointer;

  &:hover {
    color: $color-text;
  }

  &--on {
    color: $color-text;
    border-color: transparent;
    background: $color-surface-active;
  }

  &--bullish {
    box-shadow: inset 0 0 0 1px rgba($color-up, 0.6);
  }

  &--bearish {
    box-shadow: inset 0 0 0 1px rgba($color-down, 0.6);
  }

  &--clear {
    color: $color-text-muted;
  }
}

.signals__feed {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.signals__feed-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: $space-3;

  h2 {
    font-size: 1rem;
    font-weight: 650;
  }

  p {
    color: $color-text-muted;
    font-size: 0.85rem;
  }
}

.signals__state {
  padding: $space-6 $space-5;
  border: 1px dashed $color-border;
  border-radius: $radius-md;
  color: $color-text-muted;
  font-size: 0.9rem;
}

.signals__table-wrap {
  overflow-x: auto;
  border: 1px solid $color-border;
  border-radius: $radius-md;
}

.signals__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;

  th,
  td {
    padding: 0.65rem 0.9rem;
    text-align: left;
    white-space: nowrap;
  }

  thead th {
    background: $color-surface-active;
    color: $color-text-muted;
    font-weight: 600;
  }

  th[scope='row'] {
    color: $color-text-muted;
    font-weight: 500;
  }

  td a {
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

.tag {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: $color-surface-active;
  font-size: 0.75rem;

  &--bullish {
    color: $color-up;
    background: rgba($color-up, 0.12);
  }

  &--bearish {
    color: $color-down;
    background: rgba($color-down, 0.12);
  }
}

.signals__note {
  color: $color-text-muted;
  font-size: 0.78rem;
}
</style>
