<template>
  <div v-if="visible" class="test-notice" role="note">
    <div class="test-notice__inner">
      <span class="test-notice__icon" aria-hidden="true">⚠</span>
      <p>
        本站目前為<strong>測試中的個人專案</strong>，資料可能有延遲、示範或計算誤差，僅供參考與學習用途，
        <strong>不構成投資建議</strong>。正式交易決策請以<strong>證交所、櫃買中心、集保結算所</strong>等官方公告資料為準。
      </p>
      <button type="button" class="test-notice__close" aria-label="關閉提醒" @click="dismiss">✕</button>
    </div>
  </div>
</template>

<script setup>
const STORAGE_KEY = 'gumai:test-notice-dismissed'
const visible = ref(true)

onMounted(() => {
  try {
    if (sessionStorage.getItem(STORAGE_KEY) === '1') visible.value = false
  } catch {
    // 私密瀏覽等情境可能擋 sessionStorage，忽略即可，維持顯示
  }
})

function dismiss() {
  visible.value = false
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // 忽略
  }
}
</script>

<style lang="scss" scoped>
.test-notice {
  border-bottom: 1px solid rgba(#f2c94c, 0.35);
  background: rgba(#f2c94c, 0.1);
}

.test-notice__inner {
  width: min(100%, $layout-max-width);
  margin-inline: auto;
  display: flex;
  align-items: flex-start;
  gap: $space-3;
  padding: $space-3 $space-4;
  font-size: 0.82rem;
  line-height: 1.6;

  @include desktop {
    padding: $space-3 $space-6;
  }
}

.test-notice__icon {
  flex-shrink: 0;
  color: #f2c94c;
  font-size: 1rem;
}

.test-notice__inner p {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: $color-text;

  strong {
    font-weight: 650;
  }
}

.test-notice__close {
  flex-shrink: 0;
  padding: 0.15rem 0.4rem;
  border: 0;
  border-radius: $radius-sm;
  background: transparent;
  color: $color-text-muted;
  font-size: 0.85rem;
  line-height: 1;
  cursor: pointer;

  &:hover {
    color: $color-text;
    background: rgba(#f2c94c, 0.15);
  }
}
</style>
