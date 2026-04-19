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

function ensureSeedAgents(userId: number | string) {
  const items = readAll()
  const userAgents = items.filter((item) => item.userId === userId)
  if (userAgents.length > 0) return userAgents

  const timestamp = now()
  const seeds: AgentRecord[] = [
    {
      id: uid(),
      userId,
      name: '通用助手',
      description: '通用对话、知识问答与任务拆解。',
      systemPrompt: '你是一个通用智能助手。回答要清晰、准确、可执行。',
      temperature: 0.7,
      maxTokens: 1200,
      memoryEnabled: true,
      ragEnabled: true,
      toolEnabled: false,
      defaultKnowledgeBaseId: undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: uid(),
      userId,
      name: '巴菲特风格投资助手',
      description: '偏价值投资与长期主义，强调风险边际与能力圈。',
      systemPrompt: '你是一位巴菲特风格的投资助手。坚持价值投资、长期主义、安全边际、能力圈原则。先提示风险与不构成投资建议，再给出基于基本面与现金流的结构化分析。',
      temperature: 0.35,
      maxTokens: 1400,
      memoryEnabled: true,
      ragEnabled: true,
      toolEnabled: false,
      defaultKnowledgeBaseId: undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ]

  writeAll([...seeds, ...items])
  return seeds
}

export const agentStorage = {
  list(userId?: number | string) {
    if (userId === undefined) return readAll()
    const seeded = ensureSeedAgents(userId)
    return seeded.length ? readAll().filter((item) => item.userId === userId) : []
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
