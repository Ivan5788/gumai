<template>
  <div class="weighted">
    <div class="weighted__head">
      <h3 v-if="limit">{{ label }}前{{ Math.min(limit, total || limit) }}大</h3>
      <h3 v-else>{{ label }}權值股（共 {{ total }} 檔）</h3>
      <NuxtLink v-if="showMore" :to="fullPath">完整清單（{{ total }}）›</NuxtLink>
    </div>

    <p v-if="pending" class="weighted__state">載入中…</p>
    <p v-else-if="error" class="weighted__state">載入失敗，請稍後再試。</p>
    <ol v-else class="weighted__list">
      <li v-for="row in rows" :key="row.symbol">
        <NuxtLink :to="`/stock/${row.symbol}`" :data-trend="trendOf(row.change)">
          <span class="weighted__rank">{{ row.rank }}</span>
          <span class="weighted__name">
            {{ row.name }}
            <span class="weighted__symbol">{{ row.symbol }}</span>
          </span>
          <span class="weighted__price">{{ formatPrice(row.price) }}</span>
          <span class="weighted__change">
            {{ formatSigned(row.change) }}（{{ formatPercent(row.changePercent) }}）
          </span>
        </NuxtLink>
      </li>
    </ol>
  </div>
</template>

<script setup>
const props = defineProps({
  market: { type: String, required: true }, // 'TWSE' | 'TPEX'
  limit: { type: Number, default: null } // 不傳則顯示全部
})

const { data, pending: fetchPending, error } = await useApiFetch(() => `/market/weighted/${props.market}`, {
  key: () => `weighted-${props.market}`
})

const pending = computed(() => fetchPending.value && !data.value)
const label = computed(() => data.value?.label ?? (props.market === 'TWSE' ? '上市' : '上櫃'))
const total = computed(() => data.value?.total ?? 0)
const rows = computed(() => {
  const items = data.value?.items ?? []
  return props.limit ? items.slice(0, props.limit) : items
})
const showMore = computed(() => props.limit && total.value > props.limit)
const fullPath = computed(() => `/market/weighted/${props.market}`)
</script>

<style lang="scss" scoped>
.weighted {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.weighted__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: $space-3;

  h3 {
    font-size: 0.95rem;
    font-weight: 650;
  }

  a {
    flex-shrink: 0;
    color: $color-accent;
    font-size: 0.82rem;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.weighted__state {
  padding: $space-4;
  border: 1px dashed $color-border;
  border-radius: $radius-sm;
  color: $color-text-muted;
  font-size: 0.85rem;
}

.weighted__list {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  margin: 0;
  padding: 0;
  list-style: none;

  a {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: 0.55rem 0.75rem;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    color: $color-text;
    text-decoration: none;

    &:hover {
      background: $color-surface-hover;
    }
  }
}

.weighted__rank {
  flex-shrink: 0;
  width: 1.4rem;
  color: $color-text-muted;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.weighted__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.88rem;
  font-weight: 550;
}

.weighted__symbol {
  margin-left: 0.35rem;
  color: $color-text-muted;
  font-size: 0.76rem;
  font-weight: 400;
}

.weighted__price {
  flex-shrink: 0;
  font-size: 0.88rem;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.weighted__change {
  flex-shrink: 0;
  min-width: 7.5rem;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

a[data-trend='up'] {
  .weighted__price,
  .weighted__change {
    color: $color-up;
  }
}

a[data-trend='down'] {
  .weighted__price,
  .weighted__change {
    color: $color-down;
  }
}
</style>
