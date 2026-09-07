<template>
  <div class="holders">
    <p v-if="pending" class="holders__state">持股分布資料載入中…</p>
    <p v-else-if="error" class="holders__state">持股分布資料載入失敗。</p>
    <p v-else-if="data && !data.available" class="holders__state">{{ data.reason }}</p>

    <template v-else-if="data">
      <div class="holders__split">
        <div class="holders__bar" role="img" :aria-label="splitLabel">
          <span class="holders__bar-big" :style="{ width: `${data.concentration.bigPercent}%` }" />
          <span class="holders__bar-retail" :style="{ width: `${data.concentration.retailPercent}%` }" />
        </div>
        <dl class="holders__legend">
          <div>
            <dt><span class="dot dot--big" aria-hidden="true" />大戶（{{ data.threshold }}以上）</dt>
            <dd>{{ data.concentration.bigPercent.toFixed(1) }}%</dd>
          </div>
          <div>
            <dt><span class="dot dot--retail" aria-hidden="true" />散戶（{{ data.threshold }}以下）</dt>
            <dd>{{ data.concentration.retailPercent.toFixed(1) }}%</dd>
          </div>
        </dl>
      </div>

      <div class="holders__table-wrap">
        <table class="holders__table">
          <caption class="visually-hidden">持股級距分布，資料日 {{ data.asOf }}</caption>
          <thead>
            <tr>
              <th scope="col">持股級距</th>
              <th scope="col">占股權比例</th>
              <th scope="col">股東人數</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="band in data.bands" :key="band.label">
              <th scope="row">{{ band.label }}</th>
              <td>
                <span class="holders__cell">
                  <span class="holders__cell-bar" :style="{ width: `${Math.min(band.percent, 100)}%` }" />
                  {{ band.percent.toFixed(2) }}%
                </span>
              </td>
              <td>{{ formatNumber(band.holders) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="holders__note">資料日 {{ data.asOf }}。示範資料，模擬集保戶股權分散表，週更新。</p>
    </template>
  </div>
</template>

<script setup>
const props = defineProps({
  symbol: { type: String, required: true }
})

const { data, status, error } = await useApiFetch(() => `/stocks/${props.symbol}/holders`, {
  key: () => `holders-${props.symbol}`
})

const pending = computed(() => status.value === 'pending' && !data.value)

const splitLabel = computed(() => {
  if (!data.value?.available) return ''
  return `大戶 ${data.value.concentration.bigPercent.toFixed(1)}%、散戶 ${data.value.concentration.retailPercent.toFixed(1)}%`
})
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

.holders__split {
  padding: $space-5;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;
}

.holders__bar {
  display: flex;
  height: 0.75rem;
  border-radius: 999px;
  overflow: hidden;
}

.holders__bar-big {
  background: $color-accent;
}

.holders__bar-retail {
  background: $color-surface-active;
}

.holders__legend {
  display: flex;
  flex-wrap: wrap;
  gap: $space-3 $space-6;
  margin: $space-4 0 0;

  div {
    display: flex;
    align-items: baseline;
    gap: $space-2;
  }

  dt {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: $color-text-muted;
    font-size: 0.85rem;
  }

  dd {
    margin: 0;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }
}

.dot {
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  flex-shrink: 0;

  &--big {
    background: $color-accent;
  }

  &--retail {
    background: $color-surface-active;
  }
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

.holders__cell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 5rem;
  padding-right: 0.2rem;
}

.holders__cell-bar {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 1.1rem;
  background: rgba($color-accent, 0.18);
  border-radius: $radius-sm;
  z-index: 0;
}

.holders__note {
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
