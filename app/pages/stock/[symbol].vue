<template>
  <article class="page">
    <nav class="crumbs" aria-label="麵包屑">
      <NuxtLink to="/">首頁</NuxtLink>
      <span aria-hidden="true">/</span>
      <NuxtLink to="/stock">股票分析</NuxtLink>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{{ stock.name }}（{{ stock.symbol }}）</span>
    </nav>

    <header class="page__intro">
      <p class="eyebrow">{{ marketLabel }} · {{ stock.industry }}</p>
      <h1>{{ stock.name }}（{{ stock.symbol }}）股價與即時行情</h1>
      <p class="lede">
        {{ stock.name }}（{{ stock.symbol }}）為{{ marketLabel }}{{ stock.industry }}標的。
        本頁提供{{ stock.name }}的即時股價、漲跌、成交量、歷史走勢，以及日 K、週 K、當日走勢與均線等技術分析。
      </p>
    </header>

    <section aria-labelledby="stock-basics">
      <h2 id="stock-basics">基本資訊</h2>
      <dl class="facts">
        <div>
          <dt>股票代號</dt>
          <dd>{{ stock.symbol }}</dd>
        </div>
        <div>
          <dt>市場</dt>
          <dd>{{ marketLabel }}</dd>
        </div>
        <div>
          <dt>產業</dt>
          <dd>{{ stock.industry }}</dd>
        </div>
        <div>
          <dt>計價幣別</dt>
          <dd>{{ stock.currency }}</dd>
        </div>
        <div>
          <dt>昨日收盤</dt>
          <dd>{{ formatPrice(stock.previousClose) }}</dd>
        </div>
      </dl>
    </section>

    <section aria-labelledby="stock-quote">
      <h2 id="stock-quote">即時行情</h2>
      <ClientOnly>
        <dl class="quote" :data-trend="trend">
          <div class="quote__main">
            <dt>成交價</dt>
            <dd>{{ formatPrice(quote.price) }}</dd>
          </div>
          <div class="quote__main">
            <dt>漲跌</dt>
            <dd>{{ formatSigned(quote.change) }}（{{ formatPercent(quote.changePercent) }}）</dd>
          </div>
          <div>
            <dt>開盤</dt>
            <dd>{{ formatPrice(quote.open) }}</dd>
          </div>
          <div>
            <dt>最高</dt>
            <dd>{{ formatPrice(quote.high) }}</dd>
          </div>
          <div>
            <dt>最低</dt>
            <dd>{{ formatPrice(quote.low) }}</dd>
          </div>
          <div>
            <dt>成交量</dt>
            <dd>{{ formatNumber(quote.volume) }}</dd>
          </div>
        </dl>

        <template #fallback>
          <p class="quote-loading">即時行情載入中…</p>
        </template>
      </ClientOnly>
      <p class="disclaimer">目前顯示為示範資料，尚未串接正式行情來源。</p>
    </section>

    <section aria-labelledby="stock-chart">
      <h2 id="stock-chart">走勢圖</h2>
      <p class="section-hint">
        提供當日走勢、日 K、週 K 與均線（MA5／MA20／MA60）。K 線圖為互動元件，於瀏覽器載入。
      </p>
      <ClientOnly>
        <StockChartPanel
          :symbol="stock.symbol"
          :market="stock.market"
          :previous-close="stock.previousClose"
        />
        <template #fallback>
          <p class="placeholder">走勢圖載入中…</p>
        </template>
      </ClientOnly>
    </section>
  </article>
</template>

<script setup>
const route = useRoute()

const symbol = computed(() => normalizeSymbol(route.params.symbol))

const { data: stock, error } = await useApiFetch(() => `/stocks/${symbol.value}`, {
  key: () => `stock-${symbol.value}`
})

if (error.value || !stock.value) {
  throw createError({
    statusCode: error.value?.statusCode || 404,
    statusMessage: `找不到股票代號「${symbol.value}」`,
    fatal: true
  })
}

const quote = computed(() => stock.value.quote ?? {})
const trend = computed(() => trendOf(quote.value.change))
const marketLabel = computed(() => getMarket(stock.value.market)?.label ?? stock.value.market)

const title = computed(
  () => `${stock.value.name}（${stock.value.symbol}）股價、即時行情與技術分析 | StockPulse`
)
const description = computed(
  () =>
    `查看 ${stock.value.name}（${stock.value.symbol}）即時股價、漲跌與成交量，以及歷史走勢、日 K、週 K、當日走勢與均線技術分析。`
)
const path = computed(() => `/stock/${stock.value.symbol}`)

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
        { '@type': 'ListItem', position: 2, name: '股票分析', item: `${siteUrl}/stock` },
        {
          '@type': 'ListItem',
          position: 3,
          name: `${stock.value.name}（${stock.value.symbol}）`,
          item: url.value
        }
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

.facts,
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
}

.quote {
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

.quote-loading,
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
