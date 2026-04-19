import fs from 'fs'
import path from 'path'

export interface KnowledgeBaseRecord {
  id: string
  userId?: number | string
  name: string
  description?: string
  status: 'active' | 'archived' | 'deleted'
  createdAt: number
  updatedAt: number
  lastIndexedAt?: number
  documentCount: number
  chunkCount: number
  indexStatus: 'idle' | 'indexing' | 'ready' | 'failed'
  indexVersion: number
  tags?: string[]
}

const dataDir = process.env.DATA_DIR || './data'
const filePath = path.resolve(dataDir, 'knowledgeBases.json')

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]', 'utf-8')

function readAll(): KnowledgeBaseRecord[] {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as KnowledgeBaseRecord[]
  } catch {
    return []
  }
}

function writeAll(items: KnowledgeBaseRecord[]) {
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8')
}

export const knowledgeBaseStore = {
  knowledgeBases: readAll(),

  refresh() {
    this.knowledgeBases = readAll()
    return this.knowledgeBases
  },

  upsert(payload: Omit<KnowledgeBaseRecord, 'createdAt' | 'updatedAt'> & { createdAt?: number; updatedAt?: number }) {
    const items = readAll()
    const idx = items.findIndex((item) => item.id === payload.id)
    const timestamp = Date.now()
    const record: KnowledgeBaseRecord = {
      createdAt: payload.createdAt ?? timestamp,
      updatedAt: payload.updatedAt ?? timestamp,
      ...payload,
    }
    if (idx >= 0) items[idx] = { ...items[idx], ...record, updatedAt: timestamp }
    else items.unshift(record)
    writeAll(items)
    this.knowledgeBases = items
    return record
  },

  remove(id: string) {
    const items = readAll().filter((item) => item.id !== id)
    writeAll(items)
    this.knowledgeBases = items
    return true
  },
}
