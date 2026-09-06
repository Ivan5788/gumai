<template>
  <div class="error-page">
    <p class="eyebrow">Error</p>
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
    <NuxtLink to="/">回到首頁</NuxtLink>
  </div>
</template>

<script setup>
const props = defineProps({
  error: {
    type: Object,
    default: () => ({})
  }
})

const title = computed(() =>
  props.error?.statusCode === 404 ? '找不到這個頁面' : '發生錯誤'
)
const description = computed(() =>
  props.error?.statusCode === 404
    ? '請確認網址，或從 StockPulse 首頁重新開始。'
    : '伺服器暫時無法完成這個請求。'
)

useSeoMeta({
  title: () => `${title.value} | StockPulse`,
  description
})
</script>

<style lang="scss" scoped>
.error-page {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  padding: $space-8 $space-4;
}

h1 {
  font-size: clamp(1.5rem, 2.2vw, 2rem);
  font-weight: 650;
}

p {
  color: $color-text-muted;
}

a {
  color: $color-accent;
  width: fit-content;
}
</style>
