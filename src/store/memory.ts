import { defineStore } from 'pinia'

export type MemoryType = 'profile' | 'preference' | 'fact' | 'task' | 'summary'
export type MemorySource = 'user' | 'assistant' | 'system' | 'import' | 'derived'

export interface MemoryItem<T = unknown> {
  id: string
  type: MemoryType
  key: string
  value: T
  weight: number
  source: MemorySource
  sourceId?: string
  createdAt: number
  updatedAt: number
  lastAccessedAt?: number
  pinned?: boolean
  tags?: string[]
  note?: string
}

export interface MemoryQuery {
  type?: MemoryType
  key?: string
  source?: MemorySource
  tags?: string[]
  pinned?: boolean
  minWeight?: number
}

const STORAGE_KEY = 'ai-interview-memories'

const now = () => Date.now()
const uid = () => `mem_${now()}_${Math.random().toString(36).slice(2, 8)}`

const clampWeight = (weight: number) => Math.max(0, Math.min(1, weight))

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, '')

const readStorage = (): MemoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeStorage = (items: MemoryItem[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

const scoreMatch = (item: MemoryItem, query: MemoryQuery) => {
  if (query.type && item.type !== query.type) return false
  if (query.key && item.key !== query.key) return false
  if (query.source && item.source !== query.source) return false
  if (typeof query.pinned === 'boolean' && !!item.pinned !== query.pinned) return false
  if (typeof query.minWeight === 'number' && item.weight < query.minWeight) return false
  if (query.tags?.length) {
    const tags = item.tags || []
    if (!query.tags.every((tag) => tags.includes(tag))) return false
  }
  return true
}

const mergeMemoryValue = <T>(current: T, incoming: T) => {
  if (typeof current === 'string' && typeof incoming === 'string') {
    return incoming.length >= current.length ? incoming : current
  }
  if (Array.isArray(current) && Array.isArray(incoming)) {
    return Array.from(new Set([...current, ...incoming])) as T
  }
  if (current && incoming && typeof current === 'object' && typeof incoming === 'object') {
    return { ...(current as Record<string, unknown>), ...(incoming as Record<string, unknown>) } as T
  }
  return incoming
}

export const useMemoryStore = defineStore('memory', {
  state: () => ({
    items: readStorage() as MemoryItem[],
  }),

  actions: {
    persist() {
      writeStorage(this.items)
    },

    list(query: MemoryQuery = {}) {
      return [...this.items]
        .filter((item) => scoreMatch(item, query))
        .sort((a, b) => {
          if (b.pinned !== a.pinned) return Number(b.pinned) - Number(a.pinned)
          if (b.weight !== a.weight) return b.weight - a.weight
          return b.updatedAt - a.updatedAt
        })
    },

    getById(id: string) {
      const item = this.items.find((entry) => entry.id === id)
      if (item) item.lastAccessedAt = now()
      this.persist()
      return item
    },

    getByKey(type: MemoryType, key: string) {
      return this.list({ type, key })[0]
    },

    findSimilar(type: MemoryType, value: unknown, threshold = 0.85) {
      const normalizedIncoming = normalizeText(value)
      return this.items.find((item) => {
        if (item.type !== type) return false
        const current = normalizeText(item.value)
        if (!current || !normalizedIncoming) return false
        if (current === normalizedIncoming) return true
        if (current.includes(normalizedIncoming) || normalizedIncoming.includes(current)) return true
        const overlap = [...normalizedIncoming].filter((char) => current.includes(char)).length
        const ratio = overlap / Math.max(current.length, normalizedIncoming.length)
        return ratio >= threshold
      })
    },

    upsert<T>(payload: {
      type: MemoryType
      key: string
      value: T
      weight?: number
      source?: MemorySource
      sourceId?: string
      tags?: string[]
      note?: string
      pinned?: boolean
      merge?: boolean
    }) {
      const found = this.items.find((item) => item.type === payload.type && item.key === payload.key)
      const timestamp = now()
      if (found) {
        found.value = payload.merge === false ? payload.value : mergeMemoryValue(found.value, payload.value)
        found.weight = clampWeight(Math.max(found.weight, payload.weight ?? found.weight))
        found.source = payload.source ?? found.source
        found.sourceId = payload.sourceId ?? found.sourceId
        found.tags = Array.from(new Set([...(found.tags || []), ...(payload.tags || [])]))
        found.note = payload.note ?? found.note
        found.pinned = payload.pinned ?? found.pinned
        found.updatedAt = timestamp
        found.lastAccessedAt = timestamp
        this.persist()
        return found
      }
      const item: MemoryItem<T> = {
        id: uid(),
        type: payload.type,
        key: payload.key,
        value: payload.value,
        weight: clampWeight(payload.weight ?? 0.5),
        source: payload.source ?? 'user',
        sourceId: payload.sourceId,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastAccessedAt: timestamp,
        pinned: payload.pinned ?? false,
        tags: payload.tags ?? [],
        note: payload.note,
      }
      this.items.unshift(item)
      this.persist()
      return item
    },

    update<T>(id: string, patch: Partial<Omit<MemoryItem<T>, 'id' | 'createdAt'>>) {
      const item = this.items.find((entry) => entry.id === id)
      if (!item) return undefined
      Object.assign(item, patch, {
        weight: patch.weight === undefined ? item.weight : clampWeight(patch.weight),
        updatedAt: now(),
      })
      this.persist()
      return item
    },

    remove(id: string) {
      const index = this.items.findIndex((entry) => entry.id === id)
      if (index === -1) return false
      this.items.splice(index, 1)
      this.persist()
      return true
    },

    clear() {
      this.items = []
      this.persist()
    },

    mergeDuplicateMemories(type?: MemoryType) {
      const grouped = new Map<string, MemoryItem>()
      for (const item of this.items) {
        if (type && item.type !== type) continue
        const dedupeKey = `${item.type}:${normalizeText(item.value)}`
        const existing = grouped.get(dedupeKey)
        if (!existing) {
          grouped.set(dedupeKey, item)
          continue
        }
        existing.value = mergeMemoryValue(existing.value, item.value)
        existing.weight = clampWeight(Math.max(existing.weight, item.weight))
        existing.tags = Array.from(new Set([...(existing.tags || []), ...(item.tags || [])]))
        existing.updatedAt = Math.max(existing.updatedAt, item.updatedAt)
        const idx = this.items.findIndex((entry) => entry.id === item.id)
        if (idx >= 0) this.items.splice(idx, 1)
      }
      this.persist()
    },

    addProfile(key: string, value: unknown, weight = 0.8, source: MemorySource = 'user', sourceId?: string) {
      return this.upsert({ type: 'profile', key, value, weight, source, sourceId, merge: true })
    },

    addPreference(key: string, value: unknown, weight = 0.7, source: MemorySource = 'user', sourceId?: string) {
      return this.upsert({ type: 'preference', key, value, weight, source, sourceId, merge: true })
    },

    addFact(key: string, value: unknown, weight = 0.6, source: MemorySource = 'assistant', sourceId?: string) {
      return this.upsert({ type: 'fact', key, value, weight, source, sourceId, merge: true })
    },

    addTask(key: string, value: unknown, weight = 0.9, source: MemorySource = 'assistant', sourceId?: string) {
      return this.upsert({ type: 'task', key, value, weight, source, sourceId, merge: true })
    },

    addSummary(key: string, value: unknown, weight = 0.5, source: MemorySource = 'derived', sourceId?: string) {
      return this.upsert({ type: 'summary', key, value, weight, source, sourceId, merge: true })
    },
  },

  getters: {
    profileMemories: (state) => state.items.filter((item) => item.type === 'profile'),
    preferenceMemories: (state) => state.items.filter((item) => item.type === 'preference'),
    factMemories: (state) => state.items.filter((item) => item.type === 'fact'),
    taskMemories: (state) => state.items.filter((item) => item.type === 'task'),
    summaryMemories: (state) => state.items.filter((item) => item.type === 'summary'),
  },
})
