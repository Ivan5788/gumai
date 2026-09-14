<template>
  <article class="page">
    <MarketIndexBar />

    <header class="page__intro">
      <p class="eyebrow">台股 · 美股 · 即時看盤</p>
      <h1>股脈 台股與美股即時看盤與選股平台</h1>
      <p class="lede">
        股脈 提供台灣加權指數、櫃買指數與台股、美股個股的即時報價、K 線技術分析、三大法人與大戶籌碼、選股與關鍵訊號搜尋。
        登入後可建立自選股分類，並在 K 線圖上自行畫線，紀錄保存到帳號。
      </p>
    </header>

    <section class="panel-grid" aria-labelledby="overview-features">
      <h2 id="overview-features" class="visually-hidden">平台功能</h2>
      <NuxtLink to="/stock/2330" class="panel">
        <h3>個股分析</h3>
        <p>即時報價、當日走勢、60 分 K、日 K、週 K 與 MA 均線；三大法人買賣超、大戶／散戶持股變化、大戶買賣力。</p>
      </NuxtLink>
      <NuxtLink to="/screener" class="panel">
        <h3>選股系統</h3>
        <p>依站上均線、黃金交叉、突破新高、爆量、跳空、外資連買、大戶買賣力翻正等技術面與籌碼面條件篩選。</p>
      </NuxtLink>
      <NuxtLink to="/signals" class="panel">
        <h3>關鍵訊號搜尋</h3>
        <p>掃描近期剛發生的訊號，如站上季線、黃金交叉、創新高、帶量上漲、外資翻多、大戶買賣力翻紅。</p>
      </NuxtLink>
    </section>

    <section aria-labelledby="popular-stocks">
      <h2 id="popular-stocks" class="section-title">熱門股票</h2>
      <ul class="stock-links">
        <li v-for="s in stocks" :key="s.symbol">
          <NuxtLink :to="`/stock/${s.symbol}`">
            <span class="stock-links__name">{{ s.name }}</span>
            <span class="stock-links__meta">{{ s.symbol }} · {{ s.market === 'TW' ? '台股' : '美股' }}</span>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section aria-labelledby="weighted-stocks">
      <h2 id="weighted-stocks" class="section-title">大型權值股</h2>
      <p class="section-hint">台股上市與上櫃的大型權值股（靜態清單，定期校正），完整清單見各自的「完整清單」連結。</p>
      <div class="weighted-grid">
        <WeightedList market="TWSE" :limit="10" />
        <WeightedList market="TPEX" :limit="10" />
      </div>
    </section>
  </article>
</template>

<script setup>
const title = '股脈｜台股與美股即時看盤與選股平台'
const description =
  '股脈 是台股與美股即時看盤、技術分析與選股平台，提供即時報價、日 K／週 K／60 分 K、均線、三大法人、大戶籌碼、選股與關鍵訊號搜尋。'

const { data: stockData } = await useApiFetch('/stocks', { key: 'home-stocks' })
const stocks = computed(() => stockData.value?.items ?? [])

const { url } = usePageSeo({ title, description, path: '/' })

useWebPageJsonLd({
  name: title,
  description,
  url,
  siteActions: true
})
</script>

<style lang="scss" scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: $space-8;
}

.page__intro h1 {
  margin: $space-2 0 $space-3;
  font-size: clamp(1.6rem, 2.4vw, 2.15rem);
  font-weight: 650;
  letter-spacing: -0.03em;
}

.lede {
  max-width: 44rem;
  color: $color-text-muted;
  font-size: 0.98rem;
  line-height: 1.65;
}

.section-title {
  margin-bottom: $space-4;
  font-size: 1.05rem;
  font-weight: 650;
}

.section-hint {
  margin: -#{$space-2} 0 $space-4;
  color: $color-text-muted;
  font-size: 0.85rem;
  line-height: 1.6;
}

.weighted-grid {
  display: grid;
  gap: $space-5;
  grid-template-columns: 1fr;

  @include tablet {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
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
  display: block;
  min-width: 0;
  padding: $space-5;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.15s ease;

  &:hover {
    border-color: $color-accent;
  }

  h3 {
    margin-bottom: $space-2;
    font-size: 0.95rem;
    font-weight: 650;
    color: $color-accent;
  }

  p {
    color: $color-text-muted;
    font-size: 0.9rem;
    line-height: 1.6;
  }
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
  white-space: nowrap;
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
