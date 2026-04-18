import fs from 'fs'
import path from 'path'

export type MemoryType = 'profile' | 'preference' | 'fact' | 'task' | 'summary'
export type MemorySource = 'user' | 'assistant' | 'system' | 'derived' | 'import' | 'model'

export interface MemoryRecord {
  id: string
  userId: number | string
  type: MemoryType
  key: string
  value: string
  weight: number
  source: MemorySource
  confidence: number
  sourceId?: string
  createdAt: number
  updatedAt: number
  lastAccessedAt?: number
  mergedCount?: number
}

const dataDir = process.env.DATA_DIR || './data'
const filePath = path.resolve(dataDir, 'memories.json')

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]', 'utf-8')

const now = () => Date.now()
const uid = () => `mem_${now()}_${Math.random().toString(36).slice(2, 8)}`

function readAll(): MemoryRecord[] {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as MemoryRecord[]
  } catch {
    return []
  }
}

function writeAll(items: MemoryRecord[]) {
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8')
}

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, '').trim()

export const memoryStorage = {
  list(userId?: number | string) {
    const items = readAll()
    return userId === undefined ? items : items.filter((item) => item.userId === userId)
  },

  findByUser(userId: number | string) {
    return this.list(userId)
  },

  upsert(payload: Omit<MemoryRecord, 'id' | 'createdAt' | 'updatedAt' | 'lastAccessedAt'>) {
    const items = readAll()
    const idx = items.findIndex(
      (item) => item.userId === payload.userId && item.type === payload.type && normalize(item.key) === normalize(payload.key),
    )
    const timestamp = now()
    if (idx >= 0) {
      const current = items[idx]
      items[idx] = {
        ...current,
        value: payload.value.length >= current.value.length ? payload.value : current.value,
        weight: Math.max(current.weight, payload.weight),
        confidence: Math.max(current.confidence, payload.confidence),
        source: payload.source,
        sourceId: payload.sourceId ?? current.sourceId,
        updatedAt: timestamp,
        lastAccessedAt: timestamp,
        mergedCount: (current.mergedCount || 1) + 1,
      }
      writeAll(items)
      return items[idx]
    }

    const record: MemoryRecord = {
      id: uid(),
      createdAt: timestamp,
      updatedAt: timestamp,
      lastAccessedAt: timestamp,
      mergedCount: 1,
      ...payload,
    }
    items.unshift(record)
    writeAll(items)
    return record
  },

  remove(id: string) {
    const items = readAll().filter((item) => item.id !== id)
    writeAll(items)
    return true
  },

  update(id: string, patch: Partial<Omit<MemoryRecord, 'id' | 'createdAt'>>) {
    const items = readAll()
    const idx = items.findIndex((item) => item.id === id)
    if (idx === -1) return undefined
    items[idx] = { ...items[idx], ...patch, updatedAt: now() }
    writeAll(items)
    return items[idx]
  },

  clearUser(userId: number | string) {
    const items = readAll().filter((item) => item.userId !== userId)
    writeAll(items)
  },
}
