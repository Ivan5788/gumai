<template>
  <div class="holders">
    <p v-if="pending" class="holders__state">大戶／散戶資料載入中…（首次由集保資料抓取需數秒）</p>
    <p v-else-if="error" class="holders__state">大戶／散戶資料載入失敗。</p>
    <p v-else-if="data && !data.available" class="holders__state">{{ data.reason }}</p>

    <template v-else-if="data">
      <div class="holders__summary">
        <article class="holders__card">
          <h3>大戶持股（{{ data.thresholds.big }}）</h3>
          <p>{{ formatNumber(data.latest.bigShares) }} 張</p>
          <span v-if="data.latest.bigPercent != null">占集保 {{ data.latest.bigPercent }}%</span>
        </article>
        <article class="holders__card">
          <h3>散戶持股（{{ data.thresholds.retail }}）</h3>
          <p>{{ formatNumber(data.latest.retailShares) }} 張</p>
          <span v-if="data.latest.retailPercent != null">占集保 {{ data.latest.retailPercent }}%</span>
        </article>
      </div>

      <div class="holders__controls">
        <div class="seg" role="group" aria-label="對象">
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

      <template v-if="rows.length >= 2">
        <ClientOnly>
          <NetFlowChart :bars="chartBars" :line="chartLevel" :height="300" />
          <template #fallback>
            <p class="holders__state">持股走勢圖載入中…</p>
          </template>
        </ClientOnly>
        <p class="holders__note">
          長條為{{ whoLabel }}每週持股增減（紅增、綠減），黃線為持股量水位。
        </p>
      </template>
      <p v-else class="holders__state">
        週歷史資料累積中（目前 {{ rows.length }} 週），下週起可看到變化走勢。
      </p>

      <div v-if="recentRows.length" class="holders__table-wrap">
        <table class="holders__table">
          <caption class="visually-hidden">大戶與散戶每週持股量與增減（單位：{{ data.unit }}）</caption>
          <thead>
            <tr>
              <th scope="col">結算日</th>
              <th scope="col">大戶持股</th>
              <th scope="col">大戶增減</th>
              <th scope="col">散戶持股</th>
              <th scope="col">散戶增減</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in recentRows" :key="row.date">
              <th scope="row">{{ row.date }}</th>
              <td>{{ formatNumber(row.bigShares) }}</td>
              <td :class="netClass(row.bigNet)">{{ formatSigned(row.bigNet, 0) }}</td>
              <td>{{ formatNumber(row.retailShares) }}</td>
              <td :class="netClass(row.retailNet)">{{ formatSigned(row.retailNet, 0) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="holders__note">
        單位：{{ data.unit }}。大戶＝持股 {{ data.thresholds.big }}，散戶＝持股 {{ data.thresholds.retail }}。{{ sourceNote }}
      </p>
    </template>
  </div>
</template>

<script setup>
const props = defineProps({
  symbol: { type: String, required: true }
})

const who = ref('big')
const whoOptions = [
  { id: 'big', label: '大戶' },
  { id: 'retail', label: '散戶' }
]
const whoLabel = computed(() => whoOptions.find((o) => o.id === who.value)?.label ?? '')

const { data, error } = useApiFetch(() => `/stocks/${props.symbol}/holders`, {
  key: () => `holders-${props.symbol}`,
  server: false,
  lazy: true
})

const pending = computed(() => !data.value && !error.value)

const rows = computed(() => data.value?.rows ?? [])
const recentRows = computed(() => [...rows.value].reverse().slice(0, 16))

const sharesKey = computed(() => (who.value === 'big' ? 'bigShares' : 'retailShares'))
const netKey = computed(() => (who.value === 'big' ? 'bigNet' : 'retailNet'))

const chartBars = computed(() => rows.value.map((r) => ({ time: r.date, value: r[netKey.value] })))
const chartLevel = computed(() => rows.value.map((r) => ({ time: r.date, value: r[sharesKey.value] })))

const sourceNote = computed(() =>
  data.value?.source === 'tdcc'
    ? '資料來源：集保結算所（每週結算）；歷史自本站接上後每週累積。'
    : '示範資料。'
)

function netClass(value) {
  if (value > 0) return 'is-buy'
  if (value < 0) return 'is-sell'
  return ''
}
</script>

<style lang="scss" scoped>
.holders {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.holders__state {
  padding: $space-5;
  border: 1px dashed $color-border;
  border-radius: $radius-md;
  color: $color-text-muted;
  font-size: 0.9rem;
}

.holders__summary {
  display: grid;
  gap: $space-3;
  grid-template-columns: 1fr;

  @include tablet {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.holders__card {
  padding: $space-4;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;

  h3 {
    margin-bottom: $space-2;
    font-size: 0.8rem;
    font-weight: 600;
    color: $color-text-muted;
  }

  p {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }

  span {
    color: $color-text-muted;
    font-size: 0.78rem;
  }
}

.holders__controls {
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

.holders__note {
  color: $color-text-muted;
  font-size: 0.78rem;
}

.holders__table-wrap {
  overflow-x: auto;
  border: 1px solid $color-border;
  border-radius: $radius-md;
}

.holders__table {
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
