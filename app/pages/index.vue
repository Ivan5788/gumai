<template>
  <article class="page">
    <header class="page__intro">
      <p class="eyebrow">Real-Time Market Terminal</p>
      <h1>StockPulse 台股與美股即時看盤與選股平台</h1>
      <p class="lede">
        StockPulse 提供台灣股市與美國股市的看盤、技術分析與選股工作區。
        本頁說明平台定位；個股報價、圖表與選股引擎將於後續階段接上資料服務。
      </p>
    </header>

    <section class="panel-grid" aria-labelledby="overview-features">
      <h2 id="overview-features" class="visually-hidden">平台功能</h2>
      <article class="panel">
        <h3>市場工作區</h3>
        <p>切換台灣與美國市場後，搜尋、報價與列表會使用對應的市場資料來源。</p>
      </article>
      <article class="panel">
        <h3>股票分析</h3>
        <p>個股頁將提供基本資訊、歷史走勢與 K 線圖，並保留即時報價在瀏覽器端更新。</p>
      </article>
      <article class="panel">
        <h3>選股系統</h3>
        <p>第一版將支援跳空上漲、爆大量與站上均線，規則會獨立於畫面元件。</p>
      </article>
    </section>
  </article>
</template>

<script setup>
const title = 'StockPulse｜台股與美股即時看盤與選股平台'
const description =
  'StockPulse 是台股與美股即時看盤、技術分析與選股平台，提供股票資訊、走勢圖與選股工具。'
const { url } = usePageSeo({
  title,
  description,
  path: '/'
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
  font-size: clamp(1.6rem, 2.4vw, 2.15rem);
  font-weight: 650;
  letter-spacing: -0.03em;
}

.lede {
  max-width: 42rem;
  color: $color-text-muted;
  font-size: 0.98rem;
  line-height: 1.65;
}

.panel-grid {
  display: grid;
  gap: $space-4;
  grid-template-columns: 1fr;

  @include tablet {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include desktop {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.panel {
  min-width: 0;
  padding: $space-5;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;

  h3 {
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
