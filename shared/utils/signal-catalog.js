// 關鍵訊號目錄（app 與 server 共用，自動匯入）。
// direction: 'bullish' 偏多 / 'bearish' 偏空

export const SIGNAL_META = [
  { id: 'cross_above_ma20', direction: 'bullish', label: '站上月線', hint: '收盤價由下向上突破 20 日均線', keywords: ['月線', '均線', 'ma20'] },
  { id: 'cross_above_ma60', direction: 'bullish', label: '站上季線', hint: '收盤價由下向上突破 60 日均線', keywords: ['季線', '均線', 'ma60'] },
  { id: 'break_below_ma20', direction: 'bearish', label: '跌破月線', hint: '收盤價跌破 20 日均線', keywords: ['月線', '均線', '跌破'] },
  { id: 'golden_cross', direction: 'bullish', label: '黃金交叉', hint: '5 日均線向上穿越 20 日均線', keywords: ['黃金交叉', '均線', 'golden'] },
  { id: 'dead_cross', direction: 'bearish', label: '死亡交叉', hint: '5 日均線向下穿越 20 日均線', keywords: ['死亡交叉', '均線', 'dead'] },
  { id: 'new_20d_high', direction: 'bullish', label: '創 20 日新高', hint: '收盤價創近 20 個交易日新高', keywords: ['新高', '突破'] },
  { id: 'volume_spike_up', direction: 'bullish', label: '帶量上漲', hint: '爆量且收紅', keywords: ['爆量', '帶量', '量'] },
  { id: 'volume_spike_down', direction: 'bearish', label: '帶量下跌', hint: '爆量且收黑', keywords: ['爆量', '帶量', '量'] },
  { id: 'gap_up', direction: 'bullish', label: '跳空上漲', hint: '開盤跳空高於前日最高且收紅', keywords: ['跳空', '跳空上漲'] },
  { id: 'gap_down', direction: 'bearish', label: '跳空下跌', hint: '開盤跳空低於前日最低且收黑', keywords: ['跳空', '跳空下跌'] },
  { id: 'foreign_turn_buy', direction: 'bullish', label: '外資翻多', hint: '外資買賣超由負轉正', keywords: ['外資', '三大法人', '翻多'] },
  { id: 'foreign_turn_sell', direction: 'bearish', label: '外資翻空', hint: '外資買賣超由正轉負', keywords: ['外資', '三大法人', '翻空'] },
  { id: 'big_power_positive', direction: 'bullish', label: '大戶買賣力翻紅', hint: '大戶買賣力由負轉正', keywords: ['大戶', '買賣力', '主力'] },
  { id: 'big_power_negative', direction: 'bearish', label: '大戶買賣力翻綠', hint: '大戶買賣力由正轉負', keywords: ['大戶', '買賣力', '主力'] }
]

export const SIGNAL_IDS = SIGNAL_META.map((s) => s.id)

export function signalMeta(id) {
  return SIGNAL_META.find((s) => s.id === id) ?? null
}

export function signalLabel(id) {
  return signalMeta(id)?.label ?? id
}
