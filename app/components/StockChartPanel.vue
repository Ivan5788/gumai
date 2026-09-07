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

    <p class="chart-panel__note">走勢圖為示範資料，尚未串接正式行情來源。</p>
  </div>
</template>

<script setup>
const props = defineProps({
  symbol: { type: String, required: true },
  market: { type: String, default: '' },
  previousClose: { type: Number, default: null }
})

const tabs = [
  { id: 'intraday', label: '當日走勢' },
  { id: 'daily', label: '日K' },
  { id: 'weekly', label: '週K' }
]

const activeTab = ref('daily')
const activeMa = ref([5, 20, 60])
const showMa = computed(() => activeTab.value !== 'intraday')

const endpoint = computed(() => {
  if (activeTab.value === 'intraday') return `/stocks/${props.symbol}/intraday`
  const interval = activeTab.value === 'weekly' ? '1wk' : '1d'
  return `/stocks/${props.symbol}/history?interval=${interval}`
})

const { data, status, error, refresh } = useApiFetch(endpoint, {
  key: () => `chart-${props.symbol}-${activeTab.value}`,
  watch: [activeTab],
  server: false,
  lazy: true
})

// 只在「還沒有資料」時顯示載入態；輪詢刷新時保留現有圖表，避免閃爍
const pending = computed(() => status.value === 'pending' && !data.value)

// 當日走勢盤中每 20 秒重新抓取，讓走勢線延伸。
// 日 / 週 K 不需輪詢。未來可改由 useRealtimeQuote 的最新價即時 append。
let intradayTimer = null

function syncIntradayPolling(tab) {
  clearInterval(intradayTimer)
  intradayTimer = null
  if (tab === 'intraday') {
    intradayTimer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        refresh()
      }
    }, 20000)
  }
}

onMounted(() => syncIntradayPolling(activeTab.value))
watch(activeTab, (tab) => syncIntradayPolling(tab))
onBeforeUnmount(() => clearInterval(intradayTimer))

const isEmpty = computed(() => {
  const d = data.value
  if (!d) return false
  return activeTab.value === 'intraday'
    ? !(d.points && d.points.length)
    : !(d.candles && d.candles.length)
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
