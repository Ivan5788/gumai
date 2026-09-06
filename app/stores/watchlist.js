import { defineStore } from 'pinia'

// 使用者收藏（自選股）。支援多個自訂分類，每個分類可自訂名稱。
//
// 目前僅存在前端記憶體中。第 10 步接上 Google 登入後：
//   - 登入時由後端（Spring Boot）載入使用者的收藏與分類
//   - 新增 / 刪除 / 改名 時同步寫回後端
//   - 未登入時可退回 localStorage 暫存
function createId(prefix) {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${rand}`
}

export const useWatchlistStore = defineStore('watchlist', {
  state: () => ({
    categories: [{ id: 'default', name: '我的最愛', symbols: [] }],
    activeCategoryId: 'default',
    loaded: false
  }),

  getters: {
    activeCategory: (state) =>
      state.categories.find((c) => c.id === state.activeCategoryId) ||
      state.categories[0] ||
      null,

    allSymbols: (state) => {
      const set = new Set()
      state.categories.forEach((c) => c.symbols.forEach((s) => set.add(s)))
      return [...set]
    },

    isFavorite: (state) => (symbol) => {
      const s = normalizeSymbol(symbol)
      return state.categories.some((c) => c.symbols.includes(s))
    },

    categoryOf: (state) => (symbol) => {
      const s = normalizeSymbol(symbol)
      return state.categories.filter((c) => c.symbols.includes(s)).map((c) => c.id)
    }
  },

  actions: {
    addCategory(name) {
      const trimmed = String(name || '').trim()
      if (!trimmed) return null
      const category = { id: createId('cat'), name: trimmed, symbols: [] }
      this.categories.push(category)
      return category.id
    },

    renameCategory(id, name) {
      const trimmed = String(name || '').trim()
      const category = this.categories.find((c) => c.id === id)
      if (category && trimmed) {
        category.name = trimmed
      }
    },

    removeCategory(id) {
      if (id === 'default') return
      this.categories = this.categories.filter((c) => c.id !== id)
      if (this.activeCategoryId === id) {
        this.activeCategoryId = this.categories[0]?.id ?? 'default'
      }
    },

    setActiveCategory(id) {
      if (this.categories.some((c) => c.id === id)) {
        this.activeCategoryId = id
      }
    },

    addSymbol(symbol, categoryId = this.activeCategoryId) {
      const s = normalizeSymbol(symbol)
      const category = this.categories.find((c) => c.id === categoryId)
      if (s && category && !category.symbols.includes(s)) {
        category.symbols.push(s)
      }
    },

    removeSymbol(symbol, categoryId = this.activeCategoryId) {
      const s = normalizeSymbol(symbol)
      const category = this.categories.find((c) => c.id === categoryId)
      if (category) {
        category.symbols = category.symbols.filter((item) => item !== s)
      }
    },

    toggleSymbol(symbol, categoryId = this.activeCategoryId) {
      if (this.isFavorite(symbol)) {
        this.removeSymbol(symbol, categoryId)
      } else {
        this.addSymbol(symbol, categoryId)
      }
    }
  }
})
