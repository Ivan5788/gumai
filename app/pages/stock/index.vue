<template>
  <article class="page">
    <header class="page__intro">
      <p class="eyebrow">Stock Analysis</p>
      <h1>股票分析工作區</h1>
      <p class="lede">
        此路由保留給個股搜尋、報價與金融圖表。動態個股頁使用
        <code>/stock/代號</code>
        ，例如
        <NuxtLink to="/stock/2330">/stock/2330</NuxtLink>
        。即時報價與圖表尚未接上資料服務。
      </p>
    </header>

    <section class="workspace" aria-label="分析版面">
      <article class="workspace__chart panel">
        <h2>走勢圖</h2>
        <p>當日走勢、日 K 與週 K 將顯示於此區。</p>
      </article>
      <article class="workspace__quote panel">
        <h2>股票基本資訊</h2>
        <p>名稱、代號、最新價格、漲跌、開盤、最高、最低與成交量將顯示於此區。</p>
      </article>
    </section>
  </article>
</template>

<script setup>
const title = '股票分析｜股價、走勢圖與技術分析 | StockPulse'
const description = '在 StockPulse 查看台股與美股個股分析頁面，後續將提供報價、歷史走勢與 K 線圖。'
const { url } = usePageSeo({
  title,
  description,
  path: '/stock'
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

code {
  font-family: $font-mono;
  font-size: 0.88em;
}

.workspace {
  display: grid;
  gap: $space-4;
  grid-template-columns: 1fr;

  @include desktop {
    grid-template-columns: minmax(0, 1.7fr) minmax(16rem, 0.9fr);
    align-items: start;
  }
}

.panel {
  min-width: 0;
  min-height: 12rem;
  padding: $space-5;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;

  h2 {
    margin-bottom: $space-2;
    font-size: 0.95rem;
    font-weight: 650;
  }

  p {
    color: $color-text-muted;
    font-size: 0.9rem;
    line-height: 1.6;
  }
}

.workspace__chart {
  min-height: 16rem;
}

a {
  color: $color-accent;
  text-decoration: underline;
  text-underline-offset: 0.15em;
}
</style>
