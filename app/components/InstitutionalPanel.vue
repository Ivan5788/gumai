<template>
  <div class="inst">
    <p v-if="pending" class="inst__state">三大法人資料載入中…</p>
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

      <div class="inst__table-wrap">
        <table class="inst__table">
          <caption class="visually-hidden">近 {{ data.days.length }} 個交易日三大法人買賣超（單位：{{ data.unit }}）</caption>
          <thead>
            <tr>
              <th scope="col">日期</th>
              <th scope="col">外資</th>
              <th scope="col">投信</th>
              <th scope="col">自營商</th>
              <th scope="col">合計</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="day in recentDays" :key="day.date">
              <th scope="row">{{ day.date }}</th>
              <td :class="netClass(day.foreign)">{{ formatSigned(day.foreign, 0) }}</td>
              <td :class="netClass(day.trust)">{{ formatSigned(day.trust, 0) }}</td>
              <td :class="netClass(day.dealer)">{{ formatSigned(day.dealer, 0) }}</td>
              <td :class="netClass(day.total)">{{ formatSigned(day.total, 0) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="inst__note">單位：{{ data.unit }}。正值為買超、負值為賣超。示範資料，盤後彙總。</p>
    </template>
  </div>
</template>

<script setup>
const props = defineProps({
  symbol: { type: String, required: true }
})

const { data, status, error } = await useApiFetch(() => `/stocks/${props.symbol}/institutional`, {
  key: () => `inst-${props.symbol}`
})

const pending = computed(() => status.value === 'pending' && !data.value)

const recentDays = computed(() => {
  if (!data.value?.days) return []
  return [...data.value.days].reverse()
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

.inst__note {
  color: $color-text-muted;
  font-size: 0.78rem;
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
