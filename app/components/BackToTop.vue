<template>
  <button
    v-show="visible"
    type="button"
    class="back-to-top"
    aria-label="回到頂部"
    @click="scrollTop"
  >
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 15.5V4.5M10 4.5 4.5 10M10 4.5 15.5 10"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</template>

<script setup>
const visible = ref(false)

function onScroll() {
  visible.value = window.scrollY > 480
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<style lang="scss" scoped>
.back-to-top {
  position: fixed;
  right: $space-4;
  bottom: $space-4;
  z-index: 25;
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  border: 1px solid $color-border;
  border-radius: 50%;
  background: $color-surface;
  color: $color-text;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease;

  @include tablet {
    right: $space-6;
    bottom: $space-6;
  }

  svg {
    width: 1.15rem;
    height: 1.15rem;
  }

  &:hover {
    border-color: $color-accent;
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid $color-accent;
    outline-offset: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .back-to-top {
    transition: none;
  }
}
</style>
