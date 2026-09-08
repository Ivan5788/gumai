<template>
  <div ref="container" class="stock-chart" :style="{ height: `${height}px` }" />
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
  // 時間軸是否顯示到時分（60分K、當日走勢）
  showTime: { type: Boolean, default: false },
  height: { type: Number, default: 360 },
  // 畫線
  interval: { type: String, default: '1d' },
  drawings: { type: Array, default: () => [] },
  drawMode: { type: String, default: 'none' } // 'none' | 'hline' | 'trend'
})

const emit = defineEmits(['add-drawing', 'pending-change'])

const container = ref(null)

let lib = null
let chart = null
let mainSeries = null
let volumeSeries = null
let maSeries = []
let refLine = null
let resizeObserver = null

let drawPriceLines = new Map()
let drawSeries = new Map()
let pendingTrend = null

const THEME = {
  text: '#8b9bb4',
  grid: 'rgba(36, 48, 65, 0.45)',
  border: 'rgba(36, 48, 65, 0.7)',
  up: '#f5455c', // 台灣慣例：紅漲
  down: '#21c07a', // 綠跌
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
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 }
    })
  }

  chart.subscribeClick(onChartClick)

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
    const points = props.line.map((p) => ({ time: p.time, value: p.price ?? p.value ?? 0 }))
    mainSeries.setData(points)
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

  maSeries.forEach((s) => chart.removeSeries(s))
  maSeries = []
  props.maLines.forEach((ma) => {
    const s = chart.addSeries(lib.LineSeries, {
      color: ma.color,
      lineWidth: 1.5,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false
    })
    s.setData(ma.data || [])
    maSeries.push(s)
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

  // trend
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
  chart.applyOptions({
    handleScroll: !drawing,
    handleScale: !drawing
  })
  if (!drawing && pendingTrend) {
    pendingTrend = null
    emit('pending-change', false)
  }
}

watch(
  () => [props.candles, props.line, props.maLines, props.referencePrice],
  applyData,
  { deep: true }
)
watch(() => props.drawings, applyDrawings, { deep: true })
watch(() => props.drawMode, syncDrawMode)

onMounted(buildChart)

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect()
  if (chart) chart.remove()
  chart = null
  mainSeries = null
  volumeSeries = null
  maSeries = []
  refLine = null
  drawPriceLines.clear()
  drawSeries.clear()
  pendingTrend = null
})
</script>

<style lang="scss" scoped>
.stock-chart {
  width: 100%;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;
  overflow: hidden;
}
</style>
