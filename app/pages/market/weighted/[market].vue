<template>
  <article class="page">
    <nav class="crumbs" aria-label="麵包屑">
      <NuxtLink to="/">首頁</NuxtLink>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{{ label }}大型權值股</span>
    </nav>

    <header class="page__intro">
      <p class="eyebrow">大型權值股 · {{ label }}</p>
      <h1>台股{{ label }}大型權值股完整清單</h1>
      <p class="lede">
        {{ label }}大型權值股共 {{ total }} 檔（靜態清單，依概略市值排序、定期校正），
        點選個股可查看即時報價、K 線走勢與三大法人籌碼。
      </p>
    </header>

    <section aria-labelledby="weighted-table">
      <h2 id="weighted-table" class="visually-hidden">{{ label }}權值股清單</h2>
      <WeightedList :market="market" />
    </section>
  </article>
</template>

<script setup>
const route = useRoute()
const market = computed(() => String(route.params.market || '').trim().toUpperCase())

if (!['TWSE', 'TPEX'].includes(market.value)) {
  throw createError({ statusCode: 404, message: `找不到權值清單「${route.params.market}」`, fatal: true })
}

const label = computed(() => (market.value === 'TWSE' ? '上市' : '上櫃'))

const title = computed(() => `台股${label.value}大型權值股完整清單 | StockPulse`)
const description = computed(
  () => `台股${label.value}大型權值股完整清單，含即時報價與漲跌，點選個股可查看 K 線走勢與三大法人籌碼。`
)
const path = computed(() => `/market/weighted/${market.value}`)

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
        { '@type': 'ListItem', position: 2, name: `${label.value}大型權值股`, item: url.value }
      ]
    }
  ])
})

// 跟 WeightedList 用同一個 key，讓 Nuxt 的 payload 快取共用、不會重複打一次一樣的請求
const { data } = await useApiFetch(() => `/market/weighted/${market.value}`, {
  key: () => `weighted-${market.value}`
})
const total = computed(() => data.value?.total ?? 0)
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
