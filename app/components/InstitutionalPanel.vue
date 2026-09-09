<template>
  <div class="inst">
    <p v-if="pending" class="inst__state">三大法人資料載入中…（首次由資料來源抓取需數秒）</p>
    <p v-else-if="error" class="inst__state">三大法人資料載入失敗。</p>
    <p v-else-if="data && !data.available" class="inst__state">{{ data.reason }}</p>

    <template v-else-if="data">
      <div class="inst__summary">
        <article v-for="col in summaryColumns" :key="col.key" class="inst__card">
          <h3>{{ col.label }}</h3>
          <dl>
            <div v-for="row in col.rows" :key="row.key">
              <dt>{{ row.label }}</dt>
              <dd :class="netClass(row.value)">{{ formatSigned(row.value, 0) }}</dd>
            </div>
          </dl>
        </article>
      </div>

      <div class="inst__controls">
        <div class="seg" role="group" aria-label="週期">
          <button
            v-for="opt in intervalOptions"
            :key="opt.id"
            type="button"
            :class="{ 'is-active': interval === opt.id }"
            @click="interval = opt.id"
          >
            {{ opt.label }}
          </button>
        </div>
        <div class="seg" role="group" aria-label="法人">
          <button
            v-for="opt in whoOptions"
            :key="opt.id"
            type="button"
            :class="{ 'is-active': who === opt.id }"
            @click="who = opt.id"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <ClientOnly>
        <NetFlowChart :bars="chartBars" :line="chartCumulative" :height="300" />
        <template #fallback>
          <p class="inst__state">買賣超走勢圖載入中…</p>
        </template>
      </ClientOnly>
      <p class="inst__chart-note">
        長條為{{ whoLabel }}每{{ interval === '1wk' ? '週' : '日' }}買賣超（紅買超、綠賣超），黃線為期間累計。
      </p>

      <div class="inst__table-wrap">
        <table class="inst__table">
          <caption class="visually-hidden">
            {{ interval === '1wk' ? '每週' : '每日' }}三大法人買賣超（單位：{{ data.unit }}）
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ interval === '1wk' ? '週別' : '日期' }}</th>
              <th scope="col">外資</th>
              <th scope="col">投信</th>
              <th scope="col">自營商</th>
              <th scope="col">合計</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in recentRows" :key="row.date">
              <th scope="row">{{ row.date }}</th>
              <td :class="netClass(row.foreign)">{{ formatSigned(row.foreign, 0) }}</td>
              <td :class="netClass(row.trust)">{{ formatSigned(row.trust, 0) }}</td>
              <td :class="netClass(row.dealer)">{{ formatSigned(row.dealer, 0) }}</td>
              <td :class="netClass(row.total)">{{ formatSigned(row.total, 0) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="inst__note">
        單位：{{ data.unit }}。正值為買超、負值為賣超。{{ sourceNote }}
      </p>
    </template>
  </div>
</template>

<script setup>
const props = defineProps({
  symbol: { type: String, required: true }
})

const interval = ref('1d')
const who = ref('foreign')

const intervalOptions = [
  { id: '1d', label: '日' },
  { id: '1wk', label: '週' }
]
const whoOptions = [
  { id: 'foreign', label: '外資' },
  { id: 'trust', label: '投信' },
  { id: 'dealer', label: '自營商' },
  { id: 'total', label: '合計' }
]
const whoLabel = computed(() => whoOptions.find((o) => o.id === who.value)?.label ?? '')

// client-side：真實資料來源（FinMind）首次抓取需數秒
const { data, status, error } = useApiFetch(
  () => `/stocks/${props.symbol}/institutional?interval=${interval.value}`,
  {
    key: () => `inst-${props.symbol}-${interval.value}`,
    watch: [interval],
    server: false,
    lazy: true
  }
)

// server 端不抓取（server:false），一律先顯示載入態，避免 hydration mismatch
const pending = computed(() => !data.value && !error.value)

const rows = computed(() => data.value?.rows ?? [])
const recentRows = computed(() => [...rows.value].reverse().slice(0, 24))

const sourceNote = computed(() =>
  data.value?.source === 'finmind'
    ? '資料來源：FinMind（證交所盤後彙總）。'
    : '示範資料，盤後彙總。'
)

const chartBars = computed(() => rows.value.map((r) => ({ time: r.date, value: r[who.value] })))
const chartCumulative = computed(() => {
  let acc = 0
  return rows.value.map((r) => {
    acc += r[who.value]
    return { time: r.date, value: acc }
  })
})

const summaryColumns = computed(() => {
  const s = data.value?.summary
  if (!s) return []
  const cols = [
    { key: 'd1', label: '近 1 日', src: s.d1 },
    { key: 'd5', label: '近 5 日', src: s.d5 },
    { key: 'd20', label: '近 20 日', src: s.d20 }
  ]
  return cols.map((c) => ({
    key: c.key,
    label: c.label,
    rows: [
      { key: 'foreign', label: '外資', value: c.src.foreign },
      { key: 'trust', label: '投信', value: c.src.trust },
      { key: 'dealer', label: '自營商', value: c.src.dealer },
      { key: 'total', label: '合計', value: c.src.total }
    ]
  }))
})

function netClass(value) {
  if (value > 0) return 'is-buy'
  if (value < 0) return 'is-sell'
  return ''
}
</script>

<style lang="scss" scoped>
.inst {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.inst__state {
  padding: $space-5;
  border: 1px dashed $color-border;
  border-radius: $radius-md;
  color: $color-text-muted;
  font-size: 0.9rem;
}

.inst__summary {
  display: grid;
  gap: $space-3;
  grid-template-columns: 1fr;

  @include tablet {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.inst__card {
  padding: $space-4;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;

  h3 {
    margin-bottom: $space-3;
    font-size: 0.8rem;
    font-weight: 600;
    color: $color-text-muted;
  }

  dl {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    margin: 0;
  }

  dl div {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: $space-3;
  }

  dt {
    color: $color-text-muted;
    font-size: 0.85rem;
  }

  dd {
    margin: 0;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
}

.inst__controls {
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
  background: $color-surface;

  button {
    padding: 0.35rem 0.8rem;
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

.inst__chart-note,
.inst__note {
  color: $color-text-muted;
  font-size: 0.78rem;
}

.inst__table-wrap {
  overflow-x: auto;
  border: 1px solid $color-border;
  border-radius: $radius-md;
}

.inst__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;

  th,
  td {
    padding: 0.6rem 0.9rem;
    text-align: right;
    white-space: nowrap;
  }

  thead th {
    position: sticky;
    top: 0;
    background: $color-surface-active;
    color: $color-text-muted;
    font-weight: 600;
  }

  th[scope='row'] {
    text-align: left;
    color: $color-text-muted;
    font-weight: 500;
  }

  tbody tr:nth-child(even) {
    background: $color-surface;
  }
}

.is-buy {
  color: $color-up;
}

.is-sell {
  color: $color-down;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
