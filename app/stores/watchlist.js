import { defineStore } from 'pinia'

// 使用者收藏（自選股）。多個自訂分類，每個分類可自訂名稱。
// 需登入；資料由 Nitro（/api/me/watchlist，檔案儲存）保存，之後改由 Spring Boot 提供。
// 變更後以 debounce 方式整包 PUT 回伺服器。

function createId() {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `cat_${rand}`
}

function emptyState() {
  return {
    categories: [{ id: 'default', name: '自選股', symbols: [] }],
    activeCategoryId: 'default'
  }
}

let inflight = false
let dirty = false

export const useWatchlistStore = defineStore('watchlist', {
  state: () => ({
    ...emptyState(),
    loaded: false,
    syncing: false
  }),

  getters: {
    activeCategory: (state) =>
      state.categories.find((c) => c.id === state.activeCategoryId) || state.categories[0] || null,

    allSymbols: (state) => {
      const set = new Set()
      state.categories.forEach((c) => c.symbols.forEach((s) => set.add(s)))
      return [...set]
    },

    isFavorite: (state) => (symbol) => {
      const s = normalizeSymbol(symbol)
      return state.categories.some((c) => c.symbols.includes(s))
    },

    categoriesOf: (state) => (symbol) => {
      const s = normalizeSymbol(symbol)
      return state.categories.filter((c) => c.symbols.includes(s)).map((c) => c.id)
    }
  },

  actions: {
    async load() {
      try {
        const data = await $fetch('/api/me/watchlist')
        this.applyServerData(data)
      } catch {
        Object.assign(this, emptyState())
      }
      this.loaded = true
    },

    applyServerData(data) {
      this.categories = Array.isArray(data?.categories) && data.categories.length
        ? data.categories.map((c) => ({ id: c.id, name: c.name, symbols: [...c.symbols] }))
        : emptyState().categories
      this.activeCategoryId = this.categories.some((c) => c.id === data?.activeCategoryId)
        ? data.activeCategoryId
        : this.categories[0].id
    },

    reset() {
      dirty = false
      Object.assign(this, emptyState())
      this.loaded = false
      this.syncing = false
    },

    // 立即寫回，並在寫入期間累積的變更寫完後再寫一次（避免遺漏與競態）
    persist() {
      dirty = true
      if (inflight) return
      this.flush()
    },

    async flush() {
      while (dirty) {
        dirty = false
        inflight = true
        this.syncing = true
        try {
          const saved = await $fetch('/api/me/watchlist', {
            method: 'PUT',
            body: { categories: this.categories, activeCategoryId: this.activeCategoryId }
          })
          // 期間沒有新的本地變更時，才以伺服器正規化結果為準
          if (!dirty) this.applyServerData(saved)
        } catch {
          // 保留本地狀態；下次變更會再嘗試
        }
      }
      inflight = false
      this.syncing = false
    },

    addCategory(name) {
      const trimmed = String(name || '').trim().slice(0, 30)
      if (!trimmed) return null
      const id = createId()
      this.categories.push({ id, name: trimmed, symbols: [] })
      this.persist()
      return id
    },

    renameCategory(id, name) {
      const trimmed = String(name || '').trim().slice(0, 30)
      const category = this.categories.find((c) => c.id === id)
      if (category && trimmed) {
        category.name = trimmed
        this.persist()
      }
    },

    removeCategory(id) {
      if (this.categories.length <= 1) return
      this.categories = this.categories.filter((c) => c.id !== id)
      if (this.activeCategoryId === id) this.activeCategoryId = this.categories[0].id
      this.persist()
    },

    setActiveCategory(id) {
      if (this.categories.some((c) => c.id === id)) {
        this.activeCategoryId = id
        this.persist()
      }
    },

    addSymbol(symbol, categoryId = this.activeCategoryId) {
      const s = normalizeSymbol(symbol)
      const category = this.categories.find((c) => c.id === categoryId)
      if (s && category && !category.symbols.includes(s)) {
        category.symbols.push(s)
        this.persist()
      }
    },

    removeSymbol(symbol, categoryId = this.activeCategoryId) {
      const s = normalizeSymbol(symbol)
      const category = this.categories.find((c) => c.id === categoryId)
      if (category && category.symbols.includes(s)) {
        category.symbols = category.symbols.filter((item) => item !== s)
        this.persist()
      }
    },

    toggleSymbol(symbol, categoryId = this.activeCategoryId) {
      const s = normalizeSymbol(symbol)
      const category = this.categories.find((c) => c.id === categoryId)
      if (!category) return
      if (category.symbols.includes(s)) this.removeSymbol(symbol, categoryId)
      else this.addSymbol(symbol, categoryId)
    }
  }
})
