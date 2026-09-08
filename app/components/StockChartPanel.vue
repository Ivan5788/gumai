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

    <div v-if="canDraw" class="chart-panel__draw">
      <div class="seg">
        <button
          v-for="m in drawModes"
          :key="m.id"
          type="button"
          :class="{ 'is-active': drawMode === m.id }"
          @click="drawMode = m.id"
        >
          {{ m.label }}
        </button>
      </div>
      <span v-if="drawMode === 'trend'" class="chart-panel__hint">
        {{ pendingTrend ? '再點一下決定第二點' : '點一下決定第一點' }}
      </span>
      <span v-else-if="drawMode === 'hline'" class="chart-panel__hint">點一下圖表加一條水平線</span>
      <div class="chart-panel__draw-spacer" />
      <span v-if="drawSyncing" class="chart-panel__hint">儲存中…</span>
      <button
        v-if="drawings.length"
        type="button"
        class="chart-panel__clear"
        @click="clearDrawings"
      >
        清除全部（{{ drawings.length }}）
      </button>
    </div>
    <p v-else-if="activeTab === 'daily' && !loggedIn" class="chart-panel__hint chart-panel__hint--block">
      登入後可在日 K 線上自行畫線，並保存到帳號。
    </p>

    <ul v-if="canDraw && drawings.length" class="chart-panel__list">
      <li v-for="d in drawings" :key="d.id">
        <span class="dot" :style="{ background: d.type === 'hline' ? '#5aa7ff' : '#f2c94c' }" aria-hidden="true" />
        <span>{{ describeDrawing(d) }}</span>
        <button type="button" aria-label="刪除這條線" @click="removeDrawing(d.id)">✕</button>
      </li>
    </ul>

    <p v-if="pending" class="chart-panel__state">走勢圖載入中…</p>
    <p v-else-if="error" class="chart-panel__state">走勢圖載入失敗，請稍後再試。</p>
    <p v-else-if="isEmpty" class="chart-panel__state">目前沒有可顯示的資料。</p>
    <StockChart
      v-else-if="chartProps"
      :key="activeTab"
      v-bind="chartProps"
      :drawings="drawings"
      :draw-mode="activeTab === 'daily' ? drawMode : 'none'"
      @add-drawing="onAddDrawing"
      @pending-change="pendingTrend = $event"
    />

    <p class="chart-panel__note">走勢圖為示範資料，尚未串接正式行情來源。</p>
  </div>
</template>

<script setup>
const props = defineProps({
  symbol: { type: String, required: true },
  market: { type: String, default: '' },
  previousClose: { type: Number, default: null }
})

const { loggedIn } = useUserSession()

const tabs = [
  { id: 'intraday', label: '當日走勢' },
  { id: '60m', label: '60分K' },
  { id: 'daily', label: '日K' },
  { id: 'weekly', label: '週K' }
]

const INTERVAL_BY_TAB = { intraday: 'intraday', '60m': '60m', daily: '1d', weekly: '1wk' }

const activeTab = ref('daily')
const activeMa = ref([5, 20, 60])
const showMa = computed(() => activeTab.value !== 'intraday')

const endpoint = computed(() => {
  if (activeTab.value === 'intraday') return `/stocks/${props.symbol}/intraday`
  return `/stocks/${props.symbol}/history?interval=${INTERVAL_BY_TAB[activeTab.value]}`
})

const { data, status, error, refresh } = useApiFetch(endpoint, {
  key: () => `chart-${props.symbol}-${activeTab.value}`,
  watch: [activeTab],
  server: false,
  lazy: true
})

const pending = computed(() => status.value === 'pending' && !data.value)

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

// ── 畫線 ──
const drawModes = [
  { id: 'none', label: '選取' },
  { id: 'hline', label: '水平線' },
  { id: 'trend', label: '趨勢線' }
]
const drawMode = ref('none')
const pendingTrend = ref(false)
const drawings = ref([])
const drawSyncing = ref(false)

const canDraw = computed(() => loggedIn.value && activeTab.value === 'daily')

let drawInflight = false
let drawDirty = false

async function loadDrawings() {
  if (!loggedIn.value) {
    drawings.value = []
    return
  }
  try {
    const d = await $fetch(`/api/me/drawings/${props.symbol}`)
    drawings.value = Array.isArray(d?.items) ? d.items : []
  } catch {
    drawings.value = []
  }
}

async function flushDrawings() {
  while (drawDirty) {
    drawDirty = false
    drawInflight = true
    drawSyncing.value = true
    try {
      const saved = await $fetch(`/api/me/drawings/${props.symbol}`, {
        method: 'PUT',
        body: { items: drawings.value }
      })
      if (!drawDirty) drawings.value = Array.isArray(saved?.items) ? saved.items : []
    } catch {
      /* 保留本地 */
    }
  }
  drawInflight = false
  drawSyncing.value = false
}

function persistDrawings() {
  drawDirty = true
  if (!drawInflight) flushDrawings()
}

function createId() {
  const r =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `d_${r}`
}

function onAddDrawing(payload) {
  drawings.value = [...drawings.value, { id: createId(), ...payload }]
  persistDrawings()
}

function removeDrawing(id) {
  drawings.value = drawings.value.filter((d) => d.id !== id)
  persistDrawings()
}

function clearDrawings() {
  drawings.value = []
  persistDrawings()
}

function describeDrawing(d) {
  if (d.type === 'hline') return `水平線 ${formatPrice(d.price)}`
  return `趨勢線 ${formatPrice(d.a.value)} → ${formatPrice(d.b.value)}`
}

watch(
  [() => props.symbol, loggedIn],
  () => {
    drawMode.value = 'none'
    loadDrawings()
  },
  { immediate: true }
)
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

.chart-panel__tabs,
.seg {
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

.chart-panel__draw {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $space-2 $space-3;

  .seg button {
    padding: 0.32rem 0.7rem;
    font-size: 0.8rem;
  }
}

.chart-panel__draw-spacer {
  flex: 1;
}

.chart-panel__hint {
  color: $color-text-muted;
  font-size: 0.78rem;

  &--block {
    padding: $space-3 $space-4;
    border: 1px dashed $color-border;
    border-radius: $radius-sm;
  }
}

.chart-panel__clear {
  padding: 0.32rem 0.7rem;
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

.chart-panel__list {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.25rem 0.55rem;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    font-size: 0.76rem;
    font-variant-numeric: tabular-nums;
    color: $color-text-muted;

    button {
      border: 0;
      background: transparent;
      color: $color-text-muted;
      cursor: pointer;

      &:hover {
        color: $color-negative;
      }
    }
  }

  .dot {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 2px;
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
