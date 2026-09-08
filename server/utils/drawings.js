import { readUserData, writeUserData } from './user-store'

const MAX_ITEMS = 60

function num(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function sanitizeItem(raw, index) {
  const id = String(raw?.id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || `d_${index}`
  const color = /^#[0-9a-fA-F]{3,8}$/.test(raw?.color || '') ? raw.color : null

  if (raw?.type === 'hline') {
    const price = num(raw.price)
    if (price === null) return null
    return { id, type: 'hline', price, ...(color ? { color } : {}) }
  }

  if (raw?.type === 'trend') {
    const interval = ['1d', '1wk', '60m'].includes(raw.interval) ? raw.interval : '1d'
    const point = (p) => {
      const value = num(p?.value)
      const time = p?.time
      const okTime = typeof time === 'number' ? Number.isFinite(time) : typeof time === 'string' && time.length <= 20
      return value !== null && okTime ? { time, value } : null
    }
    const a = point(raw.a)
    const b = point(raw.b)
    if (!a || !b) return null
    return { id, type: 'trend', interval, a, b, ...(color ? { color } : {}) }
  }

  return null
}

export function sanitizeDrawings(body) {
  const items = Array.isArray(body?.items)
    ? body.items.map(sanitizeItem).filter(Boolean).slice(0, MAX_ITEMS)
    : []
  return { items }
}

function key(symbol) {
  return `drawings:${String(symbol).toUpperCase().replace(/[^A-Z0-9.]/g, '')}`
}

export async function getDrawings(userId, symbol) {
  const data = await readUserData(userId, key(symbol))
  return data || { items: [] }
}

export async function saveDrawings(userId, symbol, body) {
  const value = { ...sanitizeDrawings(body), updatedAt: new Date().toISOString() }
  return writeUserData(userId, key(symbol), value)
}
