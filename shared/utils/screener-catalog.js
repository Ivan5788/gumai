// 選股條件目錄（app 與 server 共用，自動匯入）。
// 只有中繼資料；實際判斷邏輯在 server/utils/screener-rules.js。

export const SCREENER_CATEGORIES = [
  { id: 'tech', label: '技術面' },
  { id: 'chips', label: '籌碼面' }
]

export const SCREENER_RULES_META = [
  { id: 'above_ma20', category: 'tech', label: '站上月線', hint: '收盤價高於 20 日均線' },
  { id: 'above_ma60', category: 'tech', label: '站上季線', hint: '收盤價高於 60 日均線' },
  { id: 'above_short_mas', category: 'tech', label: '站上三短期均線', hint: '收盤價同時站上 5、10、20 日均線' },
  { id: 'retest_ma10', category: 'tech', label: '回測10日線站回', hint: '近期逼近或跌破 10 日均線後，收盤已站回 10 日均線之上' },
  { id: 'retest_ma20', category: 'tech', label: '回測20日線站回', hint: '近期逼近或跌破 20 日均線後，收盤已站回 20 日均線之上' },
  { id: 'ma_golden_cross', category: 'tech', label: '均線黃金交叉', hint: '5 日均線近期上穿 20 日均線' },
  { id: 'break_20d_high', category: 'tech', label: '突破 20 日新高', hint: '收盤價創近 20 日新高' },
  { id: 'volume_surge', category: 'tech', label: '爆量', hint: '近 10 日成交量達 5 日均量 2 倍以上' },
  { id: 'gap_up', category: 'tech', label: '跳空上漲', hint: '近 10 日開盤跳空高於前日最高且收紅' },
  { id: 'up_streak_3', category: 'tech', label: '連 3 日上漲', hint: '連續 3 個交易日收漲' },
  { id: 'foreign_buy_streak', category: 'chips', label: '外資連買', hint: '外資連續 3 日買超' },
  { id: 'trust_buy', category: 'chips', label: '投信買超', hint: '投信最近一日買超' },
  { id: 'retail_holder_down', category: 'chips', label: '散戶持股減少', hint: '散戶（≤100 張）持股較約一個月前減少，籌碼趨於集中' },
  // paidApi：需要付費逐筆成交/內外盤資料才有真實版本，目前純示範。
  // NUXT_PUBLIC_BIGPOWER_ENABLED=false 時隱藏（見 nuxt.config.js），接上真實資料源後拿掉這個標記即可。
  { id: 'big_power_turn_positive', category: 'chips', label: '大戶買賣力翻正', hint: '大戶買賣力由負轉正', paidApi: true }
]

export const SCREENER_RULE_IDS = SCREENER_RULES_META.map((r) => r.id)

export function screenerRuleLabel(id) {
  return SCREENER_RULES_META.find((r) => r.id === id)?.label ?? id
}

// 依 bigPowerEnabled 篩掉需要付費資料源的條件（前端渲染清單、後端驗證請求參數皆用這個）
export function visibleScreenerRules(bigPowerEnabled) {
  return bigPowerEnabled ? SCREENER_RULES_META : SCREENER_RULES_META.filter((r) => !r.paidApi)
}
