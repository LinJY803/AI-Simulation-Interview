import fs from 'fs'
import path from 'path'

export interface AgentRecord {
  id: string
  userId: number | string
  name: string
  description?: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  memoryEnabled: boolean
  ragEnabled: boolean
  toolEnabled: boolean
  defaultKnowledgeBaseId?: string
  createdAt: number
  updatedAt: number
}

const dataDir = process.env.DATA_DIR || './data'
const filePath = path.resolve(dataDir, 'agents.json')

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '[]', 'utf-8')

const now = () => Date.now()
const uid = () => `agent_${now()}_${Math.random().toString(36).slice(2, 8)}`

function readAll(): AgentRecord[] {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as AgentRecord[]
  } catch {
    return []
  }
}

function writeAll(items: AgentRecord[]) {
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8')
}

export const agentStorage = {
  list(userId?: number | string) {
    const items = readAll()
    return userId === undefined ? items : items.filter((item) => item.userId === userId)
  },

  upsert(payload: Omit<AgentRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const items = readAll()
    const timestamp = now()
    const id = payload.id || uid()
    const idx = items.findIndex((item) => item.id === id)
    const record: AgentRecord = { id, createdAt: timestamp, updatedAt: timestamp, ...payload }
    if (idx >= 0) items[idx] = { ...items[idx], ...record, updatedAt: timestamp }
    else items.unshift(record)
    writeAll(items)
    return record
  },

  remove(id: string) {
    const items = readAll().filter((item) => item.id !== id)
    writeAll(items)
    return true
  },
}
