<template>
  <article class="page">
    <nav class="crumbs" aria-label="麵包屑">
      <NuxtLink to="/">首頁</NuxtLink>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{{ idx.name }}</span>
    </nav>

    <header class="page__intro">
      <p class="eyebrow">台股大盤 · {{ idx.market }}</p>
      <h1>{{ idx.name }}走勢圖與即時點數</h1>
      <p class="lede">
        {{ idx.name }}為{{ idx.market }}市場的大盤指數。本頁提供{{ idx.name }}的最新點數、漲跌、開高低，
        以及日 K、週 K<span v-if="code === 'TAIEX'">、60 分 K 與當日走勢</span>與均線（MA5／MA20／MA60）。
      </p>
    </header>

    <section aria-labelledby="idx-quote">
      <h2 id="idx-quote">最新點數</h2>
      <dl class="quote" :data-trend="trend">
        <div class="quote__main">
          <dt>收盤指數</dt>
          <dd>{{ formatPrice(idx.value) }}</dd>
        </div>
        <div class="quote__main">
          <dt>漲跌</dt>
          <dd>{{ formatSigned(idx.change) }}（{{ formatPercent(idx.changePercent) }}）</dd>
        </div>
        <div>
          <dt>開盤</dt>
          <dd>{{ formatPrice(idx.open) }}</dd>
        </div>
        <div>
          <dt>最高</dt>
          <dd>{{ formatPrice(idx.high) }}</dd>
        </div>
        <div>
          <dt>最低</dt>
          <dd>{{ formatPrice(idx.low) }}</dd>
        </div>
        <div>
          <dt>昨收</dt>
          <dd>{{ formatPrice(idx.prevClose) }}</dd>
        </div>
      </dl>
      <p class="disclaimer">
        指數為官方盤後資料<span v-if="idx.date">（資料日期 {{ idx.date }}）</span>；
        來源：證交所、櫃買中心。盤中即時指數將於後續接入。
      </p>
    </section>

    <section aria-labelledby="idx-chart">
      <h2 id="idx-chart">走勢圖</h2>
      <p class="section-hint">
        日 K、週 K<span v-if="code === 'TAIEX'">、60 分 K 與當日走勢</span>與均線。K 線圖為互動元件，於瀏覽器載入。
      </p>
      <ClientOnly>
        <IndexChartPanel :code="code" :previous-close="idx.prevClose" />
        <template #fallback>
          <p class="placeholder">走勢圖載入中…</p>
        </template>
      </ClientOnly>
    </section>
  </article>
</template>

<script setup>
const route = useRoute()
const code = computed(() => String(route.params.code || '').trim().toUpperCase())

const { data: marketData, error } = await useApiFetch('/market/indices', { key: 'market-indices' })

const idx = computed(
  () => (marketData.value?.indices ?? []).find((i) => i.code === code.value) ?? null
)

if (error.value || !idx.value) {
  throw createError({
    statusCode: 404,
    message: `找不到指數「${code.value}」`,
    fatal: true
  })
}

const trend = computed(() => trendOf(idx.value.change))

const title = computed(() => `${idx.value.name}走勢圖、即時點數與技術分析 | 股脈`)
const description = computed(
  () =>
    `查看${idx.value.name}最新點數、漲跌與開高低，日 K、週 K${
      code.value === 'TAIEX' ? '、60 分 K、當日走勢' : ''
    }與 MA 均線技術分析。`
)
const path = computed(() => `/market/${code.value}`)

const { url, siteUrl } = usePageSeo({ title, description, path })

useWebPageJsonLd({
  name: title,
  description,
  url,
  extra: computed(() => [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首頁', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: idx.value.name, item: url.value }
      ]
    }
  ])
})
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: $space-6;
}

.crumbs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $space-2;
  font-size: 0.8rem;
  color: $color-text-muted;

  a {
    color: $color-text-muted;
    text-decoration: none;

    &:hover {
      color: $color-text;
    }
  }

  span[aria-current] {
    color: $color-text;
  }
}

.page__intro h1 {
  margin: $space-2 0 $space-3;
  font-size: clamp(1.5rem, 2.2vw, 2rem);
  font-weight: 650;
  letter-spacing: -0.03em;
}

.lede {
  max-width: 42rem;
  color: $color-text-muted;
  font-size: 0.98rem;
  line-height: 1.65;
}

.section-hint {
  margin: -#{$space-2} 0 $space-4;
  color: $color-text-muted;
  font-size: 0.85rem;
  line-height: 1.6;
}

h2 {
  margin-bottom: $space-4;
  font-size: 1.05rem;
  font-weight: 650;
}

.quote {
  display: grid;
  gap: $space-4;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
  padding: $space-5;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;

  @include tablet {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  div {
    min-width: 0;
  }

  dt {
    color: $color-text-muted;
    font-size: 0.75rem;
    letter-spacing: 0.06em;
  }

  dd {
    margin: $space-1 0 0;
    font-size: 1.05rem;
    font-weight: 650;
    font-variant-numeric: tabular-nums;
  }

  &[data-trend='up'] .quote__main dd {
    color: $color-up;
  }

  &[data-trend='down'] .quote__main dd {
    color: $color-down;
  }
}

.quote__main dd {
  font-size: 1.25rem;
}

.placeholder {
  padding: $space-5;
  border: 1px dashed $color-border;
  border-radius: $radius-md;
  color: $color-text-muted;
  font-size: 0.9rem;
}

.disclaimer {
  margin-top: $space-3;
  color: $color-text-muted;
  font-size: 0.8rem;
}
</style>
