<template>
  <article class="page">
    <header class="page__intro">
      <p class="eyebrow">個股分析</p>
      <h1>個股分析</h1>
      <p class="lede">
        每檔個股頁提供即時報價、當日走勢、60 分 K、日 K、週 K 與 MA 均線，
        以及三大法人買賣超、大戶與散戶持股變化、大戶買賣力。個股網址為 <code>/stock/代號</code>，
        例如 <NuxtLink to="/stock/2330">台積電（2330）</NuxtLink>、
        <NuxtLink to="/stock/NVDA">輝達（NVDA）</NuxtLink>。
      </p>
    </header>

    <section aria-labelledby="tw-stocks">
      <h2 id="tw-stocks" class="section-title">台股</h2>
      <ul class="stock-links">
        <li v-for="s in twStocks" :key="s.symbol">
          <NuxtLink :to="`/stock/${s.symbol}`">
            <span>{{ s.name }}</span>
            <span class="stock-links__meta">{{ s.symbol }} · {{ s.industry }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section aria-labelledby="us-stocks">
      <h2 id="us-stocks" class="section-title">美股</h2>
      <ul class="stock-links">
        <li v-for="s in usStocks" :key="s.symbol">
          <NuxtLink :to="`/stock/${s.symbol}`">
            <span>{{ s.name }}</span>
            <span class="stock-links__meta">{{ s.symbol }} · {{ s.industry }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </article>
</template>

<script setup>
const title = '個股分析｜台股與美股股價、K 線與籌碼 | StockPulse'
const description =
  'StockPulse 個股分析：即時報價、當日走勢、日 K／週 K／60 分 K、均線、三大法人買賣超、大戶與散戶持股變化與大戶買賣力。'

const { data: stockData } = await useApiFetch('/stocks', { key: 'stock-index-list' })
const items = computed(() => stockData.value?.items ?? [])
const twStocks = computed(() => items.value.filter((s) => s.market === 'TW'))
const usStocks = computed(() => items.value.filter((s) => s.market === 'US'))

const { url, siteUrl } = usePageSeo({ title, description, path: '/stock' })
useWebPageJsonLd({
  name: title,
  description,
  url,
  extra: [
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首頁', item: `${siteUrl}/` },
        { '@type': 'ListItem', position: 2, name: '個股分析', item: url.value }
      ]
    }
  ]
})
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: $space-6;
}

.page__intro h1 {
  margin: $space-2 0 $space-3;
  font-size: clamp(1.5rem, 2.2vw, 2rem);
  font-weight: 650;
  letter-spacing: -0.03em;
}

.lede {
  max-width: 44rem;
  color: $color-text-muted;
  font-size: 0.98rem;
  line-height: 1.65;

  a {
    color: $color-accent;
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }
}

code {
  font-family: $font-mono;
  font-size: 0.88em;
}

.section-title {
  margin-bottom: $space-3;
  font-size: 1.05rem;
  font-weight: 650;
}

.stock-links {
  display: grid;
  gap: $space-2;
  margin: 0;
  padding: 0;
  list-style: none;
  grid-template-columns: 1fr;

  @include tablet {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include desktop {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  a {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: $space-3;
    padding: 0.7rem 0.9rem;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    color: $color-text;
    text-decoration: none;

    &:hover {
      background: $color-surface-hover;
    }
  }
}

.stock-links__meta {
  color: $color-text-muted;
  font-size: 0.78rem;
  text-align: right;
}
</style>
