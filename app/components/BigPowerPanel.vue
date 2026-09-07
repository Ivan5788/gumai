<template>
  <div class="bp">
    <p v-if="pending" class="bp__state">大戶買賣力資料載入中…</p>
    <p v-else-if="error" class="bp__state">大戶買賣力資料載入失敗。</p>
    <p v-else-if="data && !data.available" class="bp__state">{{ data.reason }}</p>

    <template v-else-if="data">
      <div class="bp__controls">
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
      </div>

      <ClientOnly>
        <NetFlowChart :bars="chartBars" :line="chartCumulative" :show-time="interval === '60m'" :height="260" />
        <template #fallback>
          <p class="bp__state">大戶買賣力圖載入中…</p>
        </template>
      </ClientOnly>
      <p class="bp__note">
        {{ data.formula }}。長條為每期間買賣力（紅偏買、綠偏賣，單位：{{ data.unit }}），黃線為期間累計。
      </p>

      <div class="bp__table-wrap">
        <table class="bp__table">
          <caption class="visually-hidden">大戶買賣力明細</caption>
          <thead>
            <tr>
              <th scope="col">{{ periodHeader }}</th>
              <th scope="col">特大單</th>
              <th scope="col">大單</th>
              <th scope="col">外盤</th>
              <th scope="col">內盤</th>
              <th scope="col">買賣力（{{ data.unit }}）</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in recentRows" :key="row.time">
              <th scope="row">{{ periodLabel(row.time) }}</th>
              <td>{{ formatNumber(row.xlOrders) }}</td>
              <td>{{ formatNumber(row.largeOrders) }}</td>
              <td>{{ formatNumber(row.outerVolume) }}</td>
              <td>{{ formatNumber(row.innerVolume) }}</td>
              <td :class="netClass(row.power)">{{ formatSigned(row.power, 0) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="bp__note">
        示範資料。真實資料需台股逐筆成交明細（依單量分級）與內外盤分類，未來由券商 API 提供。
      </p>
    </template>
  </div>
</template>

<script setup>
const props = defineProps({
  symbol: { type: String, required: true }
})

const interval = ref('1d')

const intervalOptions = [
  { id: '1d', label: '日' },
  { id: '1wk', label: '週' },
  { id: '60m', label: '60分' }
]

const periodHeader = computed(() =>
  interval.value === '1wk' ? '週別' : interval.value === '60m' ? '時間' : '日期'
)

const { data, status, error } = await useApiFetch(
  () => `/stocks/${props.symbol}/big-power?interval=${interval.value}`,
  {
    key: () => `bigpower-${props.symbol}-${interval.value}`,
    watch: [interval]
  }
)

const pending = computed(() => status.value === 'pending' && !data.value)

const rows = computed(() => data.value?.rows ?? [])
const recentRows = computed(() => [...rows.value].reverse().slice(0, 24))

const chartBars = computed(() => rows.value.map((r) => ({ time: r.time, value: r.power })))
const chartCumulative = computed(() => {
  let acc = 0
  return rows.value.map((r) => {
    acc += r.power
    return { time: r.time, value: acc }
  })
})

function periodLabel(time) {
  if (typeof time === 'number') {
    return new Date(time * 1000).toLocaleString('zh-TW', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }
  return time
}

function netClass(value) {
  if (value > 0) return 'is-buy'
  if (value < 0) return 'is-sell'
  return ''
}
</script>

<style lang="scss" scoped>
.bp {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.bp__state {
  padding: $space-5;
  border: 1px dashed $color-border;
  border-radius: $radius-md;
  color: $color-text-muted;
  font-size: 0.9rem;
}

.bp__controls {
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

.bp__note {
  color: $color-text-muted;
  font-size: 0.78rem;
}

.bp__table-wrap {
  overflow-x: auto;
  border: 1px solid $color-border;
  border-radius: $radius-md;
}

.bp__table {
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
