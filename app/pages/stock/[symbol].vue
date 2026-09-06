<template>
  <article class="page">
    <header class="page__intro">
      <p class="eyebrow">Stock Quote</p>
      <h1>{{ heading }}</h1>
      <p class="lede">
        這是 {{ symbol }} 的股票分析頁。公司名稱、歷史資料與即時報價將在資料服務完成後填入；
        目前頁面已由伺服器輸出標題、說明與語意區塊，供搜尋引擎讀取。
      </p>
    </header>

    <section aria-labelledby="stock-basics">
      <h2 id="stock-basics">股票基本資訊</h2>
      <dl class="facts">
        <div>
          <dt>股票代號</dt>
          <dd>{{ symbol }}</dd>
        </div>
        <div>
          <dt>資料狀態</dt>
          <dd>尚未串接市場資料服務</dd>
        </div>
      </dl>
    </section>
  </article>
</template>

<script setup>
const route = useRoute()

const symbol = computed(() => {
  const raw = String(route.params.symbol || '')
  return raw.replace(/[^a-zA-Z0-9.]/g, '').toUpperCase()
})

const heading = computed(() => `${symbol.value} 股價與即時行情`)
const title = computed(() => `${symbol.value} 股價、即時行情與技術分析 | StockPulse`)
const description = computed(
  () => `查看 ${symbol.value} 即時股價、歷史走勢、K線圖、均線與技術分析。`
)
const path = computed(() => `/stock/${symbol.value}`)

const { url } = usePageSeo({
  title,
  description,
  path
})

useWebPageJsonLd({
  name: title,
  description,
  url
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
  max-width: 40rem;
  color: $color-text-muted;
  font-size: 0.98rem;
  line-height: 1.65;
}

h2 {
  margin-bottom: $space-4;
  font-size: 1.05rem;
  font-weight: 650;
}

.facts {
  display: grid;
  gap: $space-4;
  grid-template-columns: 1fr;
  margin: 0;
  padding: $space-5;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;

  @include tablet {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  div {
    min-width: 0;
  }

  dt {
    color: $color-text-muted;
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  dd {
    margin: $space-1 0 0;
    font-size: 1.05rem;
    font-weight: 650;
  }
}
</style>
