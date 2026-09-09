<template>
  <section v-if="indices.length" class="index-bar" aria-label="台股大盤指數">
    <NuxtLink
      v-for="idx in indices"
      :key="idx.code"
      :to="`/market/${idx.code}`"
      class="index-bar__item"
      :data-trend="trendOf(idx.change)"
    >
      <div class="index-bar__head">
        <span class="index-bar__name">{{ idx.name }}</span>
        <span class="index-bar__tag">{{ idx.market }} · 走勢圖 ›</span>
      </div>
      <div class="index-bar__value">{{ formatPrice(idx.value) }}</div>
      <div class="index-bar__delta">
        <span>{{ formatSigned(idx.change) }}</span>
        <span>{{ formatPercent(idx.changePercent) }}</span>
      </div>
      <dl class="index-bar__ohl">
        <div><dt>開</dt><dd>{{ formatPrice(idx.open) }}</dd></div>
        <div><dt>高</dt><dd>{{ formatPrice(idx.high) }}</dd></div>
        <div><dt>低</dt><dd>{{ formatPrice(idx.low) }}</dd></div>
      </dl>
    </NuxtLink>
    <p class="index-bar__note">
      <span v-if="dateLabel">資料日期 {{ dateLabel }}（收盤）</span>
      <span>資料來源：證交所、櫃買中心</span>
    </p>
  </section>
</template>

<script setup>
const { client } = useApi()

// SSR / 預渲染時帶入真實收盤數字（可被索引）
const { data } = await useApiFetch('/market/indices', { key: 'market-indices' })

// 瀏覽器端每分鐘刷新，讓開著頁面的使用者拿到最新收盤
const live = ref(null)
let timer = null
async function refresh() {
  try {
    live.value = await client('/market/indices')
  } catch {
    // 保留現有值
  }
}
onMounted(() => {
  refresh()
  timer = setInterval(refresh, 60000)
})
onBeforeUnmount(() => timer && clearInterval(timer))

const current = computed(() => live.value ?? data.value ?? {})
const indices = computed(() => current.value.indices ?? [])
const dateLabel = computed(() => {
  const d = indices.value[0]?.date
  if (!d) return ''
  const [, m, day] = d.split('-')
  return `${Number(m)}/${Number(day)}`
})
</script>

<style lang="scss" scoped>
.index-bar {
  display: grid;
  gap: $space-3;
  grid-template-columns: 1fr;
  padding: $space-4;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;

  @include tablet {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.index-bar__item {
  display: block;
  min-width: 0;
  padding: $space-3 $space-4;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  background: $color-bg;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: $color-accent;
  }
}

.index-bar__head {
  display: flex;
  align-items: baseline;
  gap: $space-2;
}

.index-bar__name {
  font-size: 0.95rem;
  font-weight: 650;
}

.index-bar__tag {
  color: $color-text-muted;
  font-size: 0.72rem;
}

.index-bar__value {
  margin-top: $space-1;
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.index-bar__delta {
  display: flex;
  gap: $space-3;
  font-size: 0.9rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.index-bar__ohl {
  display: flex;
  gap: $space-4;
  margin: $space-3 0 0;

  div {
    display: flex;
    gap: $space-1;
  }

  dt {
    color: $color-text-muted;
    font-size: 0.75rem;
  }

  dd {
    margin: 0;
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
  }
}

.index-bar__item[data-trend='up'] {
  .index-bar__value,
  .index-bar__delta {
    color: $color-up;
  }
}

.index-bar__item[data-trend='down'] {
  .index-bar__value,
  .index-bar__delta {
    color: $color-down;
  }
}

.index-bar__note {
  display: flex;
  flex-wrap: wrap;
  gap: $space-1 $space-3;
  margin: 0;
  color: $color-text-muted;
  font-size: 0.72rem;

  @include tablet {
    grid-column: 1 / -1;
  }
}
</style>
