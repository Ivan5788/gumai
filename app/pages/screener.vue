<template>
  <article class="page">
    <header class="page__intro">
      <p class="eyebrow">Stock Screener</p>
      <h1>股票選股系統</h1>
      <p class="lede">
        設定技術面與籌碼面條件，篩選台股與美股。技術面包含站上月線／季線、均線黃金交叉、突破 20 日新高、爆量、跳空上漲、連 3 日上漲；
        籌碼面包含外資連買、投信買超、大戶持股增加、大戶買賣力翻正。
      </p>
    </header>

    <div class="screener">
      <form class="screener__filters" aria-label="選股條件" @submit.prevent>
        <fieldset>
          <legend>市場</legend>
          <div class="seg">
            <button
              v-for="m in marketOptions"
              :key="m.id"
              type="button"
              :class="{ 'is-active': market === m.id }"
              @click="market = m.id"
            >
              {{ m.label }}
            </button>
          </div>
        </fieldset>

        <fieldset>
          <legend>條件符合方式</legend>
          <div class="seg">
            <button
              v-for="mode in matchOptions"
              :key="mode.id"
              type="button"
              :class="{ 'is-active': matchMode === mode.id }"
              @click="matchMode = mode.id"
            >
              {{ mode.label }}
            </button>
          </div>
        </fieldset>

        <fieldset v-for="cat in SCREENER_CATEGORIES" :key="cat.id" class="screener__rules">
          <legend>{{ cat.label }}</legend>
          <label v-for="rule in rulesByCategory[cat.id]" :key="rule.id" class="rule">
            <input
              type="checkbox"
              :value="rule.id"
              :checked="selectedRules.includes(rule.id)"
              @change="toggleRule(rule.id)"
            />
            <span class="rule__label">{{ rule.label }}</span>
            <span class="rule__hint">{{ rule.hint }}</span>
          </label>
        </fieldset>

        <button v-if="selectedRules.length" type="button" class="screener__clear" @click="selectedRules = []">
          清除條件
        </button>
      </form>

      <section class="screener__results" aria-label="選股結果">
        <header class="screener__results-head">
          <h2>選股結果</h2>
          <p v-if="!pending">
            共 {{ data?.count ?? 0 }} 檔
            <span v-if="selectedRules.length">符合{{ matchMode === 'all' ? '全部' : '任一' }}條件</span>
          </p>
        </header>

        <p v-if="pending" class="screener__state">篩選中…</p>
        <p v-else-if="error" class="screener__state">選股服務暫時無法使用。</p>
        <p v-else-if="!data?.results.length" class="screener__state">沒有符合條件的股票。</p>

        <div v-else class="screener__table-wrap">
          <table class="screener__table">
            <thead>
              <tr>
                <th scope="col">代號</th>
                <th scope="col">名稱</th>
                <th scope="col">市場</th>
                <th scope="col">現價</th>
                <th scope="col">漲跌</th>
                <th scope="col">符合條件</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in data.results" :key="row.symbol">
                <th scope="row">
                  <NuxtLink :to="`/stock/${row.symbol}`">{{ row.symbol }}</NuxtLink>
                </th>
                <td>{{ row.name }}</td>
                <td>{{ row.market === 'TW' ? '台股' : '美股' }}</td>
                <td>{{ formatPrice(row.price) }}</td>
                <td :class="trendClass(row.change)">
                  {{ formatSigned(row.change) }}（{{ formatPercent(row.changePercent) }}）
                </td>
                <td>
                  <span v-for="id in row.matched" :key="id" class="tag">{{ screenerRuleLabel(id) }}</span>
                  <span v-if="!row.matched.length" class="screener__muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="screener__note">示範資料，股票池為 11 檔台美股樣本。正式版將涵蓋全市場並於盤後更新。</p>
      </section>
    </div>
  </article>
</template>

<script setup>
const market = ref('ALL')
const matchMode = ref('all')
const selectedRules = ref([])

const marketOptions = [
  { id: 'ALL', label: '全部' },
  { id: 'TW', label: '台股' },
  { id: 'US', label: '美股' }
]
const matchOptions = [
  { id: 'all', label: '符合全部' },
  { id: 'any', label: '符合任一' }
]

const rulesByCategory = computed(() => {
  const map = {}
  for (const cat of SCREENER_CATEGORIES) {
    map[cat.id] = SCREENER_RULES_META.filter((r) => r.category === cat.id)
  }
  return map
})

function toggleRule(id) {
  selectedRules.value = selectedRules.value.includes(id)
    ? selectedRules.value.filter((r) => r !== id)
    : [...selectedRules.value, id]
}

const requestUrl = computed(() => {
  const params = new URLSearchParams()
  if (selectedRules.value.length) params.set('rules', selectedRules.value.join(','))
  params.set('match', matchMode.value)
  if (market.value !== 'ALL') params.set('market', market.value)
  return `/screener?${params.toString()}`
})

const { data, status, error } = await useApiFetch(requestUrl, {
  key: () => `screener${requestUrl.value}`
})

const pending = computed(() => status.value === 'pending' && !data.value)

function trendClass(change) {
  const t = trendOf(change)
  return t === 'up' ? 'is-up' : t === 'down' ? 'is-down' : ''
}

const title = '股票選股系統｜技術面與籌碼面選股 | StockPulse'
const description =
  'StockPulse 選股系統，依站上均線、黃金交叉、突破新高、爆量、跳空、外資連買、投信買超、大戶買賣力等條件篩選台股與美股。'
const { url } = usePageSeo({ title, description, path: '/screener' })
useWebPageJsonLd({ name: title, description, url })
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

.screener {
  display: grid;
  gap: $space-4;
  grid-template-columns: 1fr;

  @include desktop {
    grid-template-columns: minmax(17rem, 0.8fr) minmax(0, 1.6fr);
    align-items: start;
  }
}

.screener__filters {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  padding: $space-5;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;

  fieldset {
    margin: 0;
    padding: 0;
    border: 0;
  }

  legend {
    margin-bottom: $space-2;
    padding: 0;
    color: $color-text-muted;
    font-size: 0.78rem;
    font-weight: 600;
    letter-spacing: 0.04em;
  }
}

.seg {
  display: flex;
  gap: $space-1;
  padding: $space-1;
  border: 1px solid $color-border;
  border-radius: $radius-sm;

  button {
    flex: 1;
    padding: 0.4rem 0.6rem;
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

.screener__rules {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.rule {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.15rem $space-2;
  align-items: start;
  cursor: pointer;

  input {
    grid-row: span 2;
    margin-top: 0.15rem;
  }
}

.rule__label {
  font-size: 0.9rem;
  color: $color-text;
}

.rule__hint {
  grid-column: 2;
  font-size: 0.75rem;
  color: $color-text-muted;
  line-height: 1.4;
}

.screener__clear {
  align-self: flex-start;
  padding: 0.4rem 0.9rem;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  background: transparent;
  color: $color-text-muted;
  font-size: 0.82rem;
  cursor: pointer;

  &:hover {
    color: $color-text;
  }
}

.screener__results {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.screener__results-head {
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

.screener__state {
  padding: $space-6 $space-5;
  border: 1px dashed $color-border;
  border-radius: $radius-md;
  color: $color-text-muted;
  font-size: 0.9rem;
}

.screener__table-wrap {
  overflow-x: auto;
  border: 1px solid $color-border;
  border-radius: $radius-md;
}

.screener__table {
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

  th[scope='row'] {
    text-align: left;

    a {
      color: $color-accent;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  td:nth-child(2),
  td:nth-child(3),
  td:last-child {
    text-align: left;
  }

  tbody tr:nth-child(even) {
    background: $color-surface;
  }
}

.tag {
  display: inline-block;
  margin: 0.1rem 0.25rem 0.1rem 0;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: $color-surface-active;
  color: $color-text-muted;
  font-size: 0.72rem;
  white-space: nowrap;
}

.is-up {
  color: $color-up;
}

.is-down {
  color: $color-down;
}

.screener__muted {
  color: $color-text-muted;
}

.screener__note {
  color: $color-text-muted;
  font-size: 0.78rem;
}
</style>
