import { readUserData, writeUserData } from './user-store'

const DEFAULT = () => ({
  categories: [{ id: 'default', name: '自選股', symbols: [] }],
  activeCategoryId: 'default'
})

function sanitizeCategory(raw, index) {
  const id = String(raw?.id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || `cat_${index}`
  const name = String(raw?.name || '').trim().slice(0, 30) || '未命名'
  const symbols = Array.isArray(raw?.symbols)
    ? [...new Set(raw.symbols.map((s) => String(s).trim().toUpperCase().replace(/[^A-Z0-9.]/g, '')))]
        .filter(Boolean)
        .slice(0, 300)
    : []
  return { id, name, symbols }
}

export function sanitizeWatchlist(body) {
  let categories = Array.isArray(body?.categories)
    ? body.categories.slice(0, 30).map(sanitizeCategory)
    : []

  // id 去重
  const seen = new Set()
  categories = categories.filter((c) => (seen.has(c.id) ? false : seen.add(c.id)))
  if (!categories.length) categories = DEFAULT().categories

  const activeCategoryId = categories.some((c) => c.id === body?.activeCategoryId)
    ? body.activeCategoryId
    : categories[0].id

  return { categories, activeCategoryId }
}

export async function getWatchlist(userId) {
  const data = await readUserData(userId, 'watchlist')
  return data || DEFAULT()
}

export async function saveWatchlist(userId, body) {
  const value = { ...sanitizeWatchlist(body), updatedAt: new Date().toISOString() }
  return writeUserData(userId, 'watchlist', value)
}
