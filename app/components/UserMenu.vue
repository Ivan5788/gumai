<template>
  <div class="user-menu">
    <details v-if="loggedIn" ref="dropdown" class="user-menu__wrap">
      <summary class="user-menu__trigger">
        <img v-if="user?.avatar" :src="user.avatar" alt="" class="user-menu__avatar" referrerpolicy="no-referrer" />
        <span v-else class="user-menu__avatar user-menu__avatar--fallback" aria-hidden="true">{{ initial }}</span>
        <span class="user-menu__name">{{ user?.name }}</span>
      </summary>
      <div class="user-menu__panel">
        <p class="user-menu__email">{{ user?.email }}</p>
        <NuxtLink to="/watchlist" class="user-menu__item" @click="close">我的收藏</NuxtLink>
        <button type="button" class="user-menu__item" @click="onLogout">登出</button>
      </div>
    </details>

    <details v-else ref="dropdown" class="user-menu__wrap">
      <summary class="user-menu__trigger user-menu__trigger--login">登入</summary>
      <div class="user-menu__panel">
        <a v-if="providers?.google" href="/auth/google" class="user-menu__item">使用 Google 登入</a>
        <button v-if="providers?.dev" type="button" class="user-menu__item" @click="onDevLogin">
          開發使用者登入
        </button>
        <p v-if="!providers?.google && !providers?.dev" class="user-menu__hint">
          尚未設定登入方式，請於 .env 填入 Google OAuth 憑證。
        </p>
      </div>
    </details>
  </div>
</template>

<script setup>
const { loggedIn, user, fetch: refreshSession, clear } = useUserSession()
const { data: providers } = await useFetch('/api/auth/providers')

const dropdown = ref(null)
const initial = computed(() => (user.value?.name || '?').slice(0, 1).toUpperCase())

function close() {
  if (dropdown.value) dropdown.value.open = false
}

async function onDevLogin() {
  await $fetch('/api/auth/dev-login', { method: 'POST' })
  await refreshSession()
  close()
}

async function onLogout() {
  await clear()
  close()
  await navigateTo('/')
}
</script>

<style lang="scss" scoped>
.user-menu {
  position: relative;
  flex-shrink: 0;
}

.user-menu__wrap {
  position: relative;
}

.user-menu__trigger {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  padding: 0.4rem 0.7rem;
  border: 1px solid $color-border;
  border-radius: $radius-sm;
  color: $color-text;
  font-size: 0.85rem;
  font-weight: 550;
  list-style: none;
  cursor: pointer;
  white-space: nowrap;

  &::-webkit-details-marker {
    display: none;
  }

  &:hover {
    background: $color-surface-hover;
  }

  &--login {
    color: $color-accent;
  }
}

.user-menu__avatar {
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 50%;
  object-fit: cover;
}

.user-menu__avatar--fallback {
  display: grid;
  place-items: center;
  background: $color-surface-active;
  color: $color-text-muted;
  font-size: 0.72rem;
}

.user-menu__name {
  max-width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-menu__panel {
  position: absolute;
  right: 0;
  top: calc(100% + 0.4rem);
  z-index: 30;
  min-width: 12rem;
  display: flex;
  flex-direction: column;
  padding: $space-2;
  border: 1px solid $color-border;
  border-radius: $radius-md;
  background: $color-surface;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
}

.user-menu__email {
  padding: $space-2;
  margin: 0;
  color: $color-text-muted;
  font-size: 0.75rem;
  word-break: break-all;
  border-bottom: 1px solid $color-border;
}

.user-menu__item {
  display: block;
  width: 100%;
  padding: $space-2;
  border: 0;
  border-radius: $radius-sm;
  background: transparent;
  color: $color-text;
  font-size: 0.85rem;
  text-align: left;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    background: $color-surface-hover;
  }
}

.user-menu__hint {
  padding: $space-2;
  margin: 0;
  color: $color-text-muted;
  font-size: 0.75rem;
  line-height: 1.5;
}
</style>
