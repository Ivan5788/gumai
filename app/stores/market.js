import { defineStore } from 'pinia'

// 目前選擇的市場（台股 / 美股）。切換後，搜尋、報價與清單會使用對應市場資料。
// 之後可加上以 cookie 記住使用者選擇（useCookie），讓 SSR 首屏就正確。
export const useMarketStore = defineStore('market', {
  state: () => ({
    current: DEFAULT_MARKET
  }),

  getters: {
    market: (state) => getMarket(state.current),
    label: (state) => getMarket(state.current)?.label ?? '',
    isTW: (state) => state.current === 'TW',
    isUS: (state) => state.current === 'US'
  },

  actions: {
    setMarket(code) {
      if (MARKET_CODES.includes(code)) {
        this.current = code
      }
    },

    toggle() {
      this.current = this.current === 'TW' ? 'US' : 'TW'
    }
  }
})
