<template>
  <div ref="container" class="stock-chart" :style="{ height: `${height}px` }">
    <div v-if="legend" class="stock-chart__legend">
      <span class="stock-chart__legend-date">{{ legend.date }}</span>
      <template v-if="legend.close != null && legend.open != null">
        <span>開 {{ fmtP(legend.open) }}</span>
        <span>高 {{ fmtP(legend.high) }}</span>
        <span>低 {{ fmtP(legend.low) }}</span>
        <span :class="legend.up ? 'is-up' : 'is-down'">收 {{ fmtP(legend.close) }}</span>
      </template>
      <span v-else :class="legend.up == null ? '' : legend.up ? 'is-up' : 'is-down'">
        價 {{ fmtP(legend.close) }}
      </span>
      <span v-for="m in legend.mas" :key="m.label" :style="{ color: m.color }">
        {{ m.label }} {{ fmtP(m.value) }}
      </span>
      <span v-if="legend.volume != null" class="stock-chart__legend-muted">量 {{ fmtV(legend.volume) }}</span>
    </div>
  </div>
</template>

<script setup>
// lightweight-charts 是 client-only（需要 DOM / canvas）。
// 這個元件只會被放在 <ClientOnly> 內使用。
const props = defineProps({
  // 'candlestick'（日K / 週K / 60分K）或 'area'（當日走勢）
  type: { type: String, default: 'candlestick' },
  candles: { type: Array, default: () => [] },
  line: { type: Array, default: () => [] },
  maLines: { type: Array, default: () => [] },
  showVolume: { type: Boolean, default: true },
  referencePrice: { type: Number, default: null },
  showTime: { type: Boolean, default: false },
  height: { type: Number, default: 360 },
  interval: { type: String, default: '1d' },
  drawings: { type: Array, default: () => [] },
  drawMode: { type: String, default: 'none' }
})

const emit = defineEmits(['add-drawing', 'pending-change'])

const container = ref(null)
const legend = ref(null)

let lib = null
let chart = null
let mainSeries = null
let volumeSeries = null
let maMeta = [] // [{ series, label, color, lastValue }]
let refLine = null
let resizeObserver = null

let drawPriceLines = new Map()
let drawSeries = new Map()
let pendingTrend = null

const THEME = {
  text: '#8b9bb4',
  grid: 'rgba(36, 48, 65, 0.45)',
  border: 'rgba(36, 48, 65, 0.7)',
  up: '#f5455c',
  down: '#21c07a',
  area: '#5aa7ff',
  hline: '#5aa7ff',
  trend: '#f2c94c'
}

function volumeColor(isUp) {
  return isUp ? 'rgba(245, 69, 92, 0.35)' : 'rgba(33, 192, 122, 0.35)'
}
function round2(v) {
  return Math.round(v * 100) / 100
}
function fmtP(v) {
  return v == null ? '—' : Number(v).toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtV(v) {
  return v == null ? '—' : Math.round(v).toLocaleString('zh-TW')
}
function fmtTime(t) {
  if (typeof t === 'number') {
    const d = new Date(t * 1000)
    const mm = String(d.getUTCMonth() + 1)
    const dd = String(d.getUTCDate())
    const hh = String(d.getUTCHours()).padStart(2, '0')
    const mi = String(d.getUTCMinutes()).padStart(2, '0')
    return props.showTime ? `${mm}/${dd} ${hh}:${mi}` : `${d.getUTCFullYear()}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }
  return String(t)
}

async function buildChart() {
  lib = await import('lightweight-charts')
  if (!container.value) return

  const { createChart, CandlestickSeries, AreaSeries, HistogramSeries } = lib

  chart = createChart(container.value, {
    width: container.value.clientWidth,
    height: props.height,
    layout: {
      background: { type: lib.ColorType.Solid, color: 'transparent' },
      textColor: THEME.text,
      fontFamily: '"Segoe UI", "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif'
    },
    grid: {
      vertLines: { color: THEME.grid },
      horzLines: { color: THEME.grid }
    },
    rightPriceScale: { borderColor: THEME.border },
    timeScale: {
      borderColor: THEME.border,
      timeVisible: props.type === 'area' || props.showTime,
      secondsVisible: false,
      rightOffset: 3
    },
    crosshair: { mode: lib.CrosshairMode.Normal },
    localization: {
      locale: 'zh-TW',
      priceFormatter: (p) => p.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
  })

  if (props.type === 'area') {
    mainSeries = chart.addSeries(AreaSeries, {
      lineColor: THEME.area,
      topColor: 'rgba(90, 167, 255, 0.25)',
      bottomColor: 'rgba(90, 167, 255, 0.02)',
      lineWidth: 2,
      priceLineVisible: false
    })
  } else {
    mainSeries = chart.addSeries(CandlestickSeries, {
      upColor: THEME.up,
      downColor: THEME.down,
      wickUpColor: THEME.up,
      wickDownColor: THEME.down,
      borderVisible: false
    })
  }

  if (props.showVolume) {
    volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      lastValueVisible: false
    })
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
  }

  chart.subscribeClick(onChartClick)
  chart.subscribeCrosshairMove(updateLegend)

  resizeObserver = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect?.width
    if (width && chart) chart.applyOptions({ width: Math.floor(width) })
  })
  resizeObserver.observe(container.value)

  applyData()
  syncDrawMode()
}

function applyData() {
  if (!chart || !mainSeries || !lib) return

  if (props.type === 'area') {
    mainSeries.setData(props.line.map((p) => ({ time: p.time, value: p.price ?? p.value ?? 0 })))
    if (volumeSeries) {
      volumeSeries.setData(
        props.line.map((p) => ({ time: p.time, value: p.volume ?? 0, color: 'rgba(139, 155, 180, 0.3)' }))
      )
    }
  } else {
    mainSeries.setData(props.candles)
    if (volumeSeries) {
      volumeSeries.setData(
        props.candles.map((c) => ({
          time: c.time,
          value: c.volume ?? 0,
          color: volumeColor(c.close >= c.open)
        }))
      )
    }
  }

  maMeta.forEach((m) => chart.removeSeries(m.series))
  maMeta = []
  props.maLines.forEach((ma) => {
    const series = chart.addSeries(lib.LineSeries, {
      color: ma.color,
      lineWidth: 1.5,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false
    })
    series.setData(ma.data || [])
    maMeta.push({
      series,
      label: ma.label,
      color: ma.color,
      lastValue: ma.data?.length ? ma.data[ma.data.length - 1].value : null
    })
  })

  if (refLine) {
    mainSeries.removePriceLine(refLine)
    refLine = null
  }
  if (props.referencePrice != null) {
    refLine = mainSeries.createPriceLine({
      price: props.referencePrice,
      color: THEME.text,
      lineStyle: lib.LineStyle.Dashed,
      lineWidth: 1,
      axisLabelVisible: true,
      title: '昨收'
    })
  }

  chart.timeScale().fitContent()
  applyDrawings()
  updateLegend(null)
}

function updateLegend(param) {
  if (!mainSeries) return
  const hovering = param && param.time != null && param.seriesData && param.seriesData.size

  let time
  let bar
  if (hovering) {
    time = param.time
    bar = param.seriesData.get(mainSeries)
  } else {
    const data = props.type === 'area' ? props.line : props.candles
    const d = data[data.length - 1]
    if (!d) {
      legend.value = null
      return
    }
    time = d.time
    bar = props.type === 'area' ? { value: d.price ?? d.value } : d
  }
  if (!bar) return

  const isCandle = bar.open != null && bar.close != null
  const close = isCandle ? bar.close : bar.value
  const up = isCandle ? bar.close >= bar.open : props.referencePrice != null ? close >= props.referencePrice : null

  const mas = maMeta
    .map((m) => {
      const v = hovering ? param.seriesData.get(m.series)?.value : m.lastValue
      return v == null ? null : { label: m.label, color: m.color, value: round2(v) }
    })
    .filter(Boolean)

  let volume = null
  if (volumeSeries) {
    if (hovering) volume = param.seriesData.get(volumeSeries)?.value ?? null
    else {
      const data = props.type === 'area' ? props.line : props.candles
      volume = data[data.length - 1]?.volume ?? null
    }
  }

  legend.value = {
    date: fmtTime(time),
    open: isCandle ? bar.open : null,
    high: isCandle ? bar.high : null,
    low: isCandle ? bar.low : null,
    close: close != null ? round2(close) : null,
    up,
    mas,
    volume
  }
}

function applyDrawings() {
  if (!chart || !mainSeries || !lib) return

  drawPriceLines.forEach((pl) => mainSeries.removePriceLine(pl))
  drawPriceLines.clear()
  drawSeries.forEach((s) => chart.removeSeries(s))
  drawSeries.clear()

  for (const d of props.drawings) {
    if (d.type === 'hline') {
      const pl = mainSeries.createPriceLine({
        price: d.price,
        color: d.color || THEME.hline,
        lineWidth: 1,
        lineStyle: lib.LineStyle.Solid,
        axisLabelVisible: true,
        title: ''
      })
      drawPriceLines.set(d.id, pl)
    } else if (d.type === 'trend' && d.interval === props.interval) {
      const s = chart.addSeries(lib.LineSeries, {
        color: d.color || THEME.trend,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false
      })
      const pts = [
        { time: d.a.time, value: d.a.value },
        { time: d.b.time, value: d.b.value }
      ].sort((x, y) => (x.time < y.time ? -1 : x.time > y.time ? 1 : 0))
      try {
        s.setData(pts)
        drawSeries.set(d.id, s)
      } catch {
        chart.removeSeries(s)
      }
    }
  }
}

function onChartClick(param) {
  if (props.drawMode === 'none' || !param.point || !mainSeries) return
  const price = mainSeries.coordinateToPrice(param.point.y)
  if (price == null) return

  if (props.drawMode === 'hline') {
    emit('add-drawing', { type: 'hline', price: round2(price) })
    return
  }

  const time = param.time ?? chart.timeScale().coordinateToTime(param.point.x)
  if (time == null) return
  const pt = { time, value: round2(price) }

  if (!pendingTrend) {
    pendingTrend = pt
    emit('pending-change', true)
  } else {
    emit('add-drawing', { type: 'trend', interval: props.interval, a: pendingTrend, b: pt })
    pendingTrend = null
    emit('pending-change', false)
  }
}

function syncDrawMode() {
  if (!chart || !container.value) return
  const drawing = props.drawMode !== 'none'
  container.value.style.cursor = drawing ? 'crosshair' : ''
  chart.applyOptions({ handleScroll: !drawing, handleScale: !drawing })
  if (!drawing && pendingTrend) {
    pendingTrend = null
    emit('pending-change', false)
  }
}

watch(() => [props.candles, props.line, props.maLines, props.referencePrice], applyData, { deep: true })
watch(() => props.drawings, applyDrawings, { deep: true })
watch(() => props.drawMode, syncDrawMode)

onMounted(buildChart)

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect()
  if (chart) chart.remove()
  chart = null
  mainSeries = null
  volumeSeries = null
  maMeta = []
  refLine = null
  drawPriceLines.clear()
  drawSeries.clear()
  pendingTrend = null
  legend.value = null
})
</script>

<style lang="scss" scoped>
.stock-chart {
  position: relative;
  width: 100%;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;
  overflow: hidden;
}

.stock-chart__legend {
  position: absolute;
  top: 0.5rem;
  left: 0.6rem;
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.15rem 0.75rem;
  max-width: calc(100% - 4.5rem);
  padding: 0.3rem 0.5rem;
  border-radius: $radius-sm;
  background: rgba($color-surface, 0.82);
  backdrop-filter: blur(4px);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  color: $color-text;
  pointer-events: none;
}

.stock-chart__legend-date {
  font-weight: 600;
  color: $color-text-muted;
}

.stock-chart__legend-muted {
  color: $color-text-muted;
}

.is-up {
  color: $color-up;
}
.is-down {
  color: $color-down;
}
</style>
