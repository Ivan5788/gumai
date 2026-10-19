<template>
  <article class="page">
    <nav class="crumbs" aria-label="麵包屑">
      <NuxtLink to="/">首頁</NuxtLink>
      <span aria-hidden="true">/</span>
      <NuxtLink to="/stock">個股分析</NuxtLink>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{{ stock.name }}（{{ stock.symbol }}）</span>
    </nav>

    <div class="mini-quote" :data-trend="trend" :data-limit="limitSt">
      <span class="mini-quote__symbol">{{ stock.symbol }}</span>
      <span class="mini-quote__name">{{ stock.name }}</span>
      <span class="mini-quote__price">{{ formatPrice(quote.price) }}</span>
      <span class="mini-quote__change">{{ formatSigned(quote.change) }}（{{ formatPercent(quote.changePercent) }}）</span>
      <span class="mini-quote__volume">量 {{ formatNumber(quote.volume) }}</span>
    </div>

    <header class="page__intro">
      <p class="eyebrow">{{ marketFullLabel }} · {{ stock.industry }}</p>
      <h1>{{ stock.name }}（{{ stock.symbol }}）股價與即時行情</h1>
      <WatchlistButton :symbol="stock.symbol" />
      <p class="lede">
        {{ stock.name }}（{{ stock.symbol }}）為{{ marketLabel }}{{ stock.industry }}標的。
        本頁提供{{ stock.name }}的即時股價、漲跌、成交量、歷史走勢，以及當日走勢、60 分 K、日 K、週 K 與均線，
        並含三大法人買賣超、大戶與散戶持股變化<span v-if="bigPowerEnabled">與大戶買賣力</span>。
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
          <dd>{{ marketFullLabel }}</dd>
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
            <dd :data-limit="limitSt">
              {{ formatPrice(quote.price) }}
              <span v-if="limitSt" class="quote__limit-tag">{{ limitSt === 'up' ? '漲停' : '跌停' }}</span>
            </dd>
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

        <p class="quote-status" :data-status="quoteStatus">
          <span class="quote-status__dot" aria-hidden="true" />
          {{ QUOTE_STATUS_LABELS[quoteStatus] }}
          <span v-if="quoteTime">· 更新於 {{ quoteTime }}</span>
        </p>

        <template #fallback>
          <p class="quote-loading">即時行情載入中…</p>
        </template>
      </ClientOnly>
      <p class="disclaimer">{{ quoteDisclaimer }}</p>
    </section>

    <section aria-labelledby="stock-chart">
      <h2 id="stock-chart">走勢圖</h2>
      <p class="section-hint">
        提供當日走勢、60 分 K、日 K、週 K 與均線（MA5／MA10／MA20／MA60）。K 線圖為互動元件，於瀏覽器載入。
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

    <section v-if="bigPowerEnabled" aria-labelledby="stock-bigpower">
      <h2 id="stock-bigpower">大戶買賣力</h2>
      <p class="section-hint">
        依（特大單＋大單）×（外盤－內盤）估算的大戶買賣力道，可切日／週／60 分。
      </p>
      <BigPowerPanel :symbol="stock.symbol" />
    </section>

    <section aria-labelledby="stock-institutional">
      <h2 id="stock-institutional">三大法人買賣超</h2>
      <p class="section-hint">
        外資、投信、自營商的每日／每週買賣超走勢與累計（盤後彙總）。
      </p>
      <InstitutionalPanel :symbol="stock.symbol" />
    </section>

    <section aria-labelledby="stock-holders">
      <h2 id="stock-holders">大戶與散戶持股變化</h2>
      <p class="section-hint">
        大戶（持股 1,000 張以上）與散戶（持股 100 張以下）近 8 週的持股量與增減，資料來自集保結算所。
      </p>
      <HoldersPanel :symbol="stock.symbol" />
    </section>
  </article>
</template>

<script setup>
// 大戶買賣力仍為示範資料（需付費逐筆成交/內外盤資料），未開放時隱藏整個區塊
const bigPowerEnabled = useRuntimeConfig().public.bigPowerEnabled

const route = useRoute()

const symbol = computed(() => normalizeSymbol(route.params.symbol))

const { data: stock, error } = await useApiFetch(() => `/stocks/${symbol.value}`, {
  key: () => `stock-${symbol.value}`
})

if (error.value || !stock.value) {
  throw createError({
    statusCode: error.value?.statusCode || 404,
    message: `找不到股票代號「${symbol.value}」`,
    fatal: true
  })
}

const {
  quote: liveQuote,
  status: quoteStatus,
  updatedAt: quoteUpdatedAt
} = useRealtimeQuote(symbol, { intervalMs: 30000 })

// 顯示用報價：優先即時值，其次伺服器初次回傳的快照
const quote = computed(() => liveQuote.value ?? stock.value.quote ?? {})
const trend = computed(() => trendOf(quote.value.change))
const limitSt = computed(() => limitStatus(quote.value.changePercent))
const quoteDisclaimer = computed(() => {
  if (quote.value.source === 'twse') {
    return '行情為證交所正式收盤資料（含完整成交量），每日固定收盤後更新。'
  }
  if (quote.value.source === 'twse-mis') {
    return '行情為證交所盤中即時資訊，約 5 秒延遲；正式交易決策請以官方公告為準。'
  }
  if (quote.value.source === 'yahoo-delayed') {
    return '行情為延遲報價（約 15–20 分鐘），資料來源 Yahoo Finance。'
  }
  return '行情為示範資料（以實際昨收為基準的模擬盤中）；正式行情來源將於後續接入。'
})
const quoteTime = computed(() =>
  quoteUpdatedAt.value
    ? quoteUpdatedAt.value.toLocaleTimeString('zh-TW', { hour12: false })
    : null
)
const marketLabel = computed(() => getMarket(stock.value.market)?.label ?? stock.value.market)
const listingLabel = computed(() =>
  stock.value.listing === 'TPEx' ? '上櫃' : stock.value.listing === 'TWSE' ? '上市' : null
)
// 市場欄位：台股會加註上市／上櫃，美股維持原本只顯示「美股」
const marketFullLabel = computed(() =>
  listingLabel.value ? `${marketLabel.value}・${listingLabel.value}` : marketLabel.value
)

const title = computed(
  () => `${stock.value.name}（${stock.value.symbol}）股價、即時行情與技術分析 | 股脈`
)
const description = computed(
  () =>
    `查看 ${stock.value.name}（${stock.value.symbol}）即時股價、漲跌與成交量，歷史走勢、日 K、週 K、60 分 K 與均線技術分析，以及三大法人買賣超與大戶散戶持股變化。`
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
        { '@type': 'ListItem', position: 2, name: '個股分析', item: `${siteUrl}/stock` },
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

.page__intro :deep(.wl) {
  margin-bottom: $space-4;
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
  // :not([data-limit]) 是必要的——沒有這個，這條規則的 specificity 比下面
  // .quote__main dd[data-limit] 的白字規則還高，漲停時會被蓋成紅底紅字看不清楚
  // （已經實測踩到這個問題，不是預防性寫法）。
  &[data-trend='up'] .quote__main dd:not([data-limit]) {
    color: $color-up;
  }

  &[data-trend='down'] .quote__main dd:not([data-limit]) {
    color: $color-down;
  }
}

.quote__main dd {
  font-size: 1.25rem;

  // 漲停／跌停：背景色塊 + 白字，比純粹的紅/綠字更醒目，一眼就能跟一般漲跌分開
  &[data-limit] {
    display: inline-flex;
    align-items: baseline;
    gap: $space-2;
    padding: 0.1rem 0.6rem;
    border-radius: $radius-sm;
    color: #fff;
  }

  &[data-limit='up'] {
    background: $color-up;
  }

  &[data-limit='down'] {
    background: $color-down;
  }
}

.quote__limit-tag {
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.05em;
}

.mini-quote {
  position: sticky;
  top: var(--pinned-height, 64px);
  z-index: 15;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: $space-1 $space-3;
  margin: 0 0 $space-4;
  padding: $space-2 $space-4;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  // 跟警語同一個原則：不用透明度，滾動時底下的內容才不會透出來疊在一起看不清楚
  background: $color-surface;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.mini-quote__symbol {
  font-weight: 700;
}

.mini-quote__name {
  color: $color-text-muted;
}

.mini-quote__price {
  font-weight: 700;
  font-size: 0.95rem;
}

.mini-quote__volume {
  color: $color-text-muted;
  margin-left: auto;
}

// :not([data-limit]) 避免跟下面漲跌停的白字規則打架——同樣的坑在上面
// .quote 區塊踩過一次（specificity 比較高蓋過去），這裡先一併預防。
.mini-quote[data-trend='up'] .mini-quote__price:not([data-limit]),
.mini-quote[data-trend='up'] .mini-quote__change {
  color: $color-up;
}

.mini-quote[data-trend='down'] .mini-quote__price:not([data-limit]),
.mini-quote[data-trend='down'] .mini-quote__change {
  color: $color-down;
}

.mini-quote[data-limit='up'] .mini-quote__price {
  padding: 0.1rem 0.5rem;
  border-radius: $radius-sm;
  background: $color-up;
  color: #fff;
}

.mini-quote[data-limit='down'] .mini-quote__price {
  padding: 0.1rem 0.5rem;
  border-radius: $radius-sm;
  background: $color-down;
  color: #fff;
}

.quote-status {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-top: $space-3;
  color: $color-text-muted;
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.quote-status__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: $color-text-muted;
  flex-shrink: 0;
}

.quote-status[data-status='live'] .quote-status__dot {
  background: $color-positive;
  box-shadow: 0 0 0 0 rgba($color-positive, 0.6);
  animation: quote-pulse 2s ease-out infinite;
}

.quote-status[data-status='stalled'] .quote-status__dot {
  background: #f2c94c;
}

.quote-status[data-status='error'] .quote-status__dot {
  background: $color-negative;
}

@keyframes quote-pulse {
  to {
    box-shadow: 0 0 0 0.5rem rgba($color-positive, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .quote-status__dot {
    animation: none !important;
  }
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
