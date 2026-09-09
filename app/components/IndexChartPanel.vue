<template>
  <div class="chart-panel">
    <div class="chart-panel__bar">
      <div class="chart-panel__tabs" role="tablist" aria-label="走勢圖種類">
        <button
          v-for="t in tabs"
          :key="t.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === t.id"
          :class="{ 'is-active': activeTab === t.id }"
          @click="activeTab = t.id"
        >
          {{ t.label }}
        </button>
      </div>

      <div v-if="showMa" class="chart-panel__ma">
        <label v-for="p in MA_PRESETS" :key="p.period">
          <input v-model="activeMa" type="checkbox" :value="p.period" />
          <span :style="{ color: p.color }">{{ p.label }}</span>
        </label>
      </div>
    </div>

    <p v-if="pending" class="chart-panel__state">走勢圖載入中…</p>
    <p v-else-if="error" class="chart-panel__state">走勢圖載入失敗，請稍後再試。</p>
    <p v-else-if="isEmpty" class="chart-panel__state">目前沒有可顯示的資料。</p>
    <StockChart v-else-if="chartProps" :key="activeTab" v-bind="chartProps" />

    <p class="chart-panel__note">{{ sourceNote }}</p>
  </div>
</template>

<script setup>
const props = defineProps({
  code: { type: String, required: true },
  previousClose: { type: Number, default: null }
})

const ALL_TABS = [
  { id: 'intraday', label: '當日走勢' },
  { id: '60m', label: '60分K' },
  { id: 'daily', label: '日K' },
  { id: 'weekly', label: '週K' }
]
// 櫃買指數：Yahoo 資料已停更，僅提供日 K / 週 K
const tabs = computed(() =>
  props.code === 'TAIEX' ? ALL_TABS : ALL_TABS.filter((t) => t.id === 'daily' || t.id === 'weekly')
)

const INTERVAL_BY_TAB = { intraday: 'intraday', '60m': '60m', daily: '1d', weekly: '1wk' }

const activeTab = ref('daily')
const activeMa = ref([5, 20, 60])
const showMa = computed(() => activeTab.value !== 'intraday')

const endpoint = computed(() =>
  activeTab.value === 'intraday'
    ? `/market/${props.code}/intraday`
    : `/market/${props.code}/history?interval=${INTERVAL_BY_TAB[activeTab.value]}`
)

const { data, status, error, refresh } = useApiFetch(endpoint, {
  key: () => `index-chart-${props.code}-${activeTab.value}`,
  watch: [activeTab],
  server: false,
  lazy: true
})

const pending = computed(() => status.value === 'pending' && !data.value)

const sourceNote = computed(() => {
  const src = data.value?.source
  if (src === 'finmind') return '資料來源：FinMind（盤後）。'
  if (src === 'yahoo') return '資料來源：Yahoo Finance（約 15–20 分鐘延遲）。'
  return '目前無此資料來源。'
})

let intradayTimer = null
function syncIntradayPolling(tab) {
  clearInterval(intradayTimer)
  intradayTimer = null
  if (tab === 'intraday') {
    intradayTimer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') refresh()
    }, 20000)
  }
}
onMounted(() => syncIntradayPolling(activeTab.value))
watch(activeTab, (tab) => syncIntradayPolling(tab))
onBeforeUnmount(() => clearInterval(intradayTimer))

const isEmpty = computed(() => {
  const d = data.value
  if (!d) return false
  return activeTab.value === 'intraday' ? !(d.points && d.points.length) : !(d.candles && d.candles.length)
})

const chartProps = computed(() => {
  const d = data.value
  if (!d) return null

  if (activeTab.value === 'intraday') {
    return {
      type: 'area',
      line: d.points || [],
      referencePrice: d.previousClose ?? props.previousClose ?? null,
      showVolume: true,
      interval: 'intraday',
      height: 340
    }
  }

  const candles = d.candles || []
  return {
    type: 'candlestick',
    candles,
    maLines: activeMa.value.map((period) => {
      const preset = MA_PRESETS.find((p) => p.period === period)
      return { label: preset.label, color: preset.color, data: maLine(candles, period) }
    }),
    showVolume: true,
    showTime: activeTab.value === '60m',
    interval: INTERVAL_BY_TAB[activeTab.value],
    height: 380
  }
})
</script>

<style lang="scss" scoped>
.chart-panel {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.chart-panel__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
}

.chart-panel__tabs {
  display: flex;
  gap: $space-1;
  padding: $space-1;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  background: $color-surface;

  button {
    padding: 0.4rem 0.85rem;
    border: 0;
    border-radius: calc(#{$radius-sm} - 0.15rem);
    background: transparent;
    color: $color-text-muted;
    font-size: 0.85rem;
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

.chart-panel__ma {
  display: flex;
  gap: $space-3;
  font-size: 0.8rem;

  label {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    cursor: pointer;
  }
}

.chart-panel__state {
  display: grid;
  place-items: center;
  min-height: 20rem;
  border: 1px dashed $color-border;
  border-radius: $radius-md;
  color: $color-text-muted;
  font-size: 0.9rem;
}

.chart-panel__note {
  color: $color-text-muted;
  font-size: 0.78rem;
}
</style>
