// 上市／上櫃「大型權值股」靜態清單（人工維護，依概略市值/知名度排序）。
// 目的：首頁展示 + 完整清單頁。與 server/utils/stock-pool.js（選股/訊號掃描用的股票池）
// 是兩份不同用途的清單，互不影響。
//
// 沒有免費、即時的「個股市值排行」或指數成分股權重 API，這份清單只能人工維護、
// 定期校正（例如季配合 0050 成分股調整），不是每天動態抓取。名稱皆已對照 FinMind
// TaiwanStockInfo 驗證過上市／上櫃別，避免分類錯誤（如世界先進為上市、世界為上櫃）。

export const TWSE_WEIGHTED = [
  { symbol: '2330', name: '台積電' },
  { symbol: '2317', name: '鴻海' },
  { symbol: '2454', name: '聯發科' },
  { symbol: '2412', name: '中華電' },
  { symbol: '2881', name: '富邦金' },
  { symbol: '2882', name: '國泰金' },
  { symbol: '6505', name: '台塑化' },
  { symbol: '2308', name: '台達電' },
  { symbol: '2891', name: '中信金' },
  { symbol: '1303', name: '南亞' },
  { symbol: '1301', name: '台塑' },
  { symbol: '2886', name: '兆豐金' },
  { symbol: '3711', name: '日月光投控' },
  { symbol: '2382', name: '廣達' },
  { symbol: '2892', name: '第一金' },
  { symbol: '2884', name: '玉山金' },
  { symbol: '5880', name: '合庫金' },
  { symbol: '2885', name: '元大金' },
  { symbol: '2890', name: '永豐金' },
  { symbol: '2880', name: '華南金' },
  { symbol: '2883', name: '凱基金' },
  { symbol: '1216', name: '統一' },
  { symbol: '2002', name: '中鋼' },
  { symbol: '3034', name: '聯詠' },
  { symbol: '2379', name: '瑞昱' },
  { symbol: '2357', name: '華碩' },
  { symbol: '4938', name: '和碩' },
  { symbol: '2327', name: '國巨' },
  { symbol: '2345', name: '智邦' },
  { symbol: '3231', name: '緯創' },
  { symbol: '2376', name: '技嘉' },
  { symbol: '3661', name: '世芯-KY' },
  { symbol: '2409', name: '友達' },
  { symbol: '2912', name: '統一超' },
  { symbol: '9910', name: '豐泰' },
  { symbol: '1590', name: '亞德客-KY' },
  { symbol: '2603', name: '長榮' },
  { symbol: '2609', name: '陽明' },
  { symbol: '2615', name: '萬海' },
  { symbol: '1101', name: '台泥' },
  { symbol: '2207', name: '和泰車' },
  { symbol: '3008', name: '大立光' },
  { symbol: '2801', name: '彰銀' },
  { symbol: '2887', name: '台新新光金' },
  { symbol: '5871', name: '中租-KY' },
  { symbol: '6415', name: '矽力*-KY' },
  { symbol: '2618', name: '長榮航' },
  { symbol: '2610', name: '華航' },
  { symbol: '2377', name: '微星' },
  { symbol: '6239', name: '力成' }
]

export const TPEX_WEIGHTED = [
  { symbol: '6488', name: '環球晶' },
  { symbol: '8299', name: '群聯' },
  { symbol: '3105', name: '穩懋' },
  { symbol: '3529', name: '力旺' },
  { symbol: '5347', name: '世界' },
  { symbol: '6446', name: '藥華藥' },
  { symbol: '6547', name: '高端疫苗' },
  { symbol: '4966', name: '譜瑞-KY' },
  { symbol: '5274', name: '信驊' },
  { symbol: '8069', name: '元太' },
  { symbol: '6510', name: '精測' },
  { symbol: '3374', name: '精材' },
  { symbol: '6182', name: '合晶' },
  { symbol: '3707', name: '漢磊' },
  { symbol: '3260', name: '威剛' },
  { symbol: '3211', name: '順達' },
  { symbol: '4123', name: '晟德' },
  { symbol: '4147', name: '中裕' },
  { symbol: '4162', name: '智擎' },
  { symbol: '6472', name: '保瑞' },
  { symbol: '1565', name: '精華' },
  { symbol: '4991', name: '環宇-KY' },
  { symbol: '3081', name: '聯亞' },
  { symbol: '8054', name: '安國' },
  { symbol: '3227', name: '原相' },
  { symbol: '5443', name: '均豪' },
  { symbol: '4171', name: '瑞基' },
  { symbol: '3552', name: '同致' },
  { symbol: '8121', name: '越峰' },
  { symbol: '6294', name: '智基' },
  { symbol: '1264', name: '德麥' },
  { symbol: '6180', name: '橘子' },
  { symbol: '5905', name: '南仁湖' }
]

export function weightedListFor(market) {
  const m = String(market || '').trim().toUpperCase()
  if (m === 'TWSE') return TWSE_WEIGHTED
  if (m === 'TPEX') return TPEX_WEIGHTED
  return null
}
