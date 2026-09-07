<template>
  <div ref="container" class="net-flow-chart" :style="{ height: `${height}px` }" />
</template>

<script setup>
// 可重用的「買賣超」圖：長條（正紅負綠）＋ 可選的累計折線。
// client-only，放在 <ClientOnly> 內使用。8b 三大法人、8c 大戶散戶、8d 大戶買賣力共用。
const props = defineProps({
  bars: { type: Array, default: () => [] }, // [{ time, value }]
  line: { type: Array, default: () => [] }, // [{ time, value }] 累計，可省略
  showTime: { type: Boolean, default: false },
  height: { type: Number, default: 300 }
})

const container = ref(null)

let lib = null
let chart = null
let histSeries = null
let lineSeries = null
let resizeObserver = null

const THEME = {
  text: '#8b9bb4',
  grid: 'rgba(36, 48, 65, 0.45)',
  border: 'rgba(36, 48, 65, 0.7)',
  up: '#f5455c', // 買超（台灣：紅）
  down: '#21c07a', // 賣超（綠）
  line: '#f2c94c'
}

async function build() {
  lib = await import('lightweight-charts')
  if (!container.value) return

  const { createChart, HistogramSeries, LineSeries } = lib

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
    leftPriceScale: { visible: props.line.length > 0, borderColor: THEME.border },
    timeScale: {
      borderColor: THEME.border,
      timeVisible: props.showTime,
      secondsVisible: false,
      rightOffset: 2
    },
    crosshair: { mode: lib.CrosshairMode.Normal },
    localization: {
      locale: 'zh-TW',
      priceFormatter: (v) => v.toLocaleString('zh-TW')
    }
  })

  histSeries = chart.addSeries(HistogramSeries, {
    priceLineVisible: false,
    lastValueVisible: false,
    base: 0
  })

  if (props.line.length) {
    lineSeries = chart.addSeries(LineSeries, {
      color: THEME.line,
      lineWidth: 2,
      priceScaleId: 'left',
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: true
    })
  }

  resizeObserver = new ResizeObserver((entries) => {
    const width = entries[0]?.contentRect?.width
    if (width && chart) chart.applyOptions({ width: Math.floor(width) })
  })
  resizeObserver.observe(container.value)

  applyData()
}

function applyData() {
  if (!chart || !histSeries) return

  histSeries.setData(
    props.bars.map((b) => ({
      time: b.time,
      value: b.value,
      color: b.value >= 0 ? THEME.up : THEME.down
    }))
  )

  if (lineSeries) {
    lineSeries.setData(props.line.map((p) => ({ time: p.time, value: p.value })))
  }

  chart.timeScale().fitContent()
}

watch(() => [props.bars, props.line], applyData, { deep: true })

onMounted(build)

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect()
  if (chart) chart.remove()
  chart = null
  histSeries = null
  lineSeries = null
})
</script>

<style lang="scss" scoped>
.net-flow-chart {
  width: 100%;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;
  overflow: hidden;
}
</style>
