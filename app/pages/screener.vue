<template>
  <article class="page">
    <header class="page__intro">
      <p class="eyebrow">Stock Screener</p>
      <h1>股票選股系統</h1>
      <p class="lede">
        選股條件將包含跳空上漲、爆大量與站上均線。規則引擎尚未接入，本頁提供可被搜尋引擎讀取的說明與版面骨架。
      </p>
    </header>

    <section class="screener-layout" aria-label="選股工作區">
      <article class="panel">
        <h2>選股條件</h2>
        <p>篩選控制項將出現在此欄。</p>
      </article>
      <article class="panel">
        <h2>選股結果</h2>
        <p>符合條件的股票列表將出現在此欄。</p>
      </article>
    </section>
  </article>
</template>

<script setup>
const title = '股票選股系統｜跳空、爆量與均線 | StockPulse'
const description = 'StockPulse 選股系統將提供跳空上漲、爆大量與站上均線等條件，協助篩選台股與美股。'
const { url } = usePageSeo({
  title,
  description,
  path: '/screener'
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

.screener-layout {
  display: grid;
  gap: $space-4;
  grid-template-columns: 1fr;

  @include desktop {
    grid-template-columns: minmax(16rem, 0.85fr) minmax(0, 1.4fr);
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
</style>
