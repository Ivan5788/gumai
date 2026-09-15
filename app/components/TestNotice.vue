<template>
  <div class="test-notice" role="note">
    <div class="test-notice__inner">
      <span class="test-notice__icon" aria-hidden="true">⚠</span>
      <p>
        本站目前為<strong>測試中的個人專案</strong>，資料可能有延遲、示範或計算誤差，僅供參考與學習用途，
        <strong>不構成投資建議</strong>。正式交易決策請以<strong>證交所、櫃買中心、集保結算所</strong>等官方公告資料為準。
      </p>
    </div>
  </div>
</template>

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
  gap: $space-2;
  padding: $space-1 $space-4;
  font-size: 0.68rem;
  line-height: 1.5;

  @include desktop {
    padding: $space-1 $space-6;
  }
}

.test-notice__icon {
  flex-shrink: 0;
  color: #f2c94c;
  font-size: 0.8rem;
}

.test-notice__inner p {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: $color-text-muted;

  strong {
    color: $color-text;
    font-weight: 650;
  }
}
</style>
