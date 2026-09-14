<template>
  <footer class="app-footer">
    <div class="app-footer__inner">
      <div class="app-footer__brand">
        <span class="app-footer__name">股脈 GuMai</span>
        <p class="app-footer__desc">台股與美股即時看盤、技術分析與選股平台。</p>
      </div>

      <nav class="app-footer__links" aria-label="頁尾導覽">
        <div class="app-footer__group">
          <h3>平台</h3>
          <NuxtLink to="/">總覽</NuxtLink>
          <NuxtLink to="/stock">個股分析</NuxtLink>
          <NuxtLink to="/screener">選股系統</NuxtLink>
          <NuxtLink to="/signals">關鍵訊號搜尋</NuxtLink>
          <NuxtLink to="/watchlist">我的收藏</NuxtLink>
        </div>
        <div class="app-footer__group">
          <h3>大盤</h3>
          <NuxtLink to="/market/TAIEX">加權指數</NuxtLink>
          <NuxtLink to="/market/TPEX">櫃買指數</NuxtLink>
          <NuxtLink to="/market/weighted/TWSE">上市權值股</NuxtLink>
          <NuxtLink to="/market/weighted/TPEX">上櫃權值股</NuxtLink>
        </div>
      </nav>
    </div>

    <div class="app-footer__bottom">
      <div class="app-footer__bottom-inner">
        <p>
          資料來源：臺灣證券交易所、證券櫃檯買賣中心、臺灣集中保管結算所、FinMind、Yahoo
          Finance。行情多為盤後或延遲資料，僅供參考，不構成投資建議。
        </p>
        <p>© {{ year }} 股脈 GuMai</p>
      </div>
    </div>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear()
</script>

<style lang="scss" scoped>
.app-footer {
  border-top: 1px solid $color-border;
  background: $color-surface;
}

.app-footer__inner {
  width: min(100%, $layout-max-width);
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  gap: $space-6;
  padding: $space-8 $space-4 $space-6;

  @include tablet {
    flex-direction: row;
    justify-content: space-between;
    padding: $space-8 $space-6 $space-6;
  }
}

.app-footer__brand {
  max-width: 20rem;
}

.app-footer__name {
  font-size: 1rem;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.app-footer__desc {
  margin: $space-2 0 0;
  color: $color-text-muted;
  font-size: 0.85rem;
  line-height: 1.6;
}

.app-footer__links {
  display: flex;
  flex-wrap: wrap;
  gap: $space-6;
}

.app-footer__group {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  min-width: 8rem;

  h3 {
    margin-bottom: $space-1;
    color: $color-text-muted;
    font-size: 0.75rem;
    font-weight: 650;
    letter-spacing: 0.06em;
  }

  a {
    color: $color-text;
    font-size: 0.85rem;
    text-decoration: none;

    &:hover {
      color: $color-accent;
    }
  }
}

.app-footer__bottom {
  border-top: 1px solid $color-border;
}

.app-footer__bottom-inner {
  width: min(100%, $layout-max-width);
  margin: 0 auto;
  padding: $space-4;
  display: flex;
  flex-direction: column;
  gap: $space-1;

  @include tablet {
    padding: $space-4 $space-6;
  }

  p {
    margin: 0;
    color: $color-text-muted;
    font-size: 0.75rem;
    line-height: 1.6;
  }
}
</style>
