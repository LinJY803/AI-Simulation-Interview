import type { useKnowledgeBaseStore } from '@/store/knowledgeBase'
import type { MemoryType, useMemoryStore } from '@/store/memory'

export type ToolValueType = 'string' | 'number' | 'boolean' | 'object' | 'array'

export interface ToolSchemaProperty {
  type: ToolValueType
  description?: string
  required?: boolean
  enum?: Array<string | number | boolean>
}

export interface ToolSchema {
  type: 'object'
  properties: Record<string, ToolSchemaProperty>
  required?: string[]
  additionalProperties?: boolean
}

export interface ToolCallContext {
  userId?: number | string
  conversationId?: string
  agentId?: string
  requestedAt: number
}

export interface ToolCallRecord {
  id: string
  toolName: string
  input: Record<string, unknown>
  output?: unknown
  status: 'running' | 'success' | 'error'
  startedAt: number
  finishedAt?: number
  error?: string
  durationMs?: number
}

export interface ToolDefinition<TInput extends Record<string, unknown> = Record<string, unknown>, TOutput = unknown> {
  name: string
  description: string
  schema: ToolSchema
  execute: (input: TInput, context: ToolCallContext) => Promise<TOutput> | TOutput
}

const uid = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

const getType = (value: unknown): ToolValueType => {
  if (Array.isArray(value)) return 'array'
  if (value === null) return 'object'
  return typeof value as ToolValueType
}

const validateToolInput = (schema: ToolSchema, input: Record<string, unknown>) => {
  if (schema.type !== 'object') throw new Error('仅支持 object 类型的工具输入 schema')
  const required = new Set([...(schema.required || []), ...Object.keys(schema.properties).filter((key) => schema.properties[key].required)])

  for (const key of required) {
    if (!(key in input)) {
      throw new Error(`缺少必填参数: ${key}`)
    }
  }

  for (const [key, value] of Object.entries(input)) {
    const rule = schema.properties[key]
    if (!rule) {
      if (schema.additionalProperties === false) {
        throw new Error(`不支持的参数: ${key}`)
      }
      continue
    }

    const valueType = getType(value)
    if (valueType !== rule.type) {
      throw new Error(`参数 ${key} 类型错误，期望 ${rule.type}，实际 ${valueType}`)
    }

    if (rule.enum?.length && !rule.enum.includes(value as never)) {
      throw new Error(`参数 ${key} 不在允许范围内`)
    }
  }
}

interface ToolInvokeOptions {
  callId?: string
  onUpdate?: (record: ToolCallRecord) => void
}

export interface ToolRuntime {
  register: (tool: ToolDefinition) => void
  getToolSchema: () => Array<Pick<ToolDefinition, 'name' | 'description' | 'schema'>>
  invoke: (toolName: string, input: Record<string, unknown>, context: ToolCallContext, options?: ToolInvokeOptions) => Promise<ToolCallRecord>
  listLogs: () => ToolCallRecord[]
  clearLogs: () => void
}

export function createToolRuntime(initialTools: ToolDefinition[] = []): ToolRuntime {
  const tools = new Map<string, ToolDefinition>()
  const logs: ToolCallRecord[] = []

  initialTools.forEach((tool) => tools.set(tool.name, tool))

  return {
    register(tool) {
      tools.set(tool.name, tool)
    },

    getToolSchema() {
      return [...tools.values()].map((tool) => ({ name: tool.name, description: tool.description, schema: tool.schema }))
    },

    async invoke(toolName, input, context, options) {
      const tool = tools.get(toolName)
      if (!tool) throw new Error(`未注册工具: ${toolName}`)

      validateToolInput(tool.schema, input)

      const startedAt = Date.now()
      const record: ToolCallRecord = {
        id: options?.callId || uid('tool_call'),
        toolName,
        input,
        status: 'running',
        startedAt,
      }
      logs.unshift(record)
      options?.onUpdate?.({ ...record })

      try {
        const output = await tool.execute(input, context)
        record.output = output
        record.status = 'success'
        record.finishedAt = Date.now()
        record.durationMs = record.finishedAt - record.startedAt
        options?.onUpdate?.({ ...record })
        return record
      } catch (error) {
        record.status = 'error'
        record.error = error instanceof Error ? error.message : String(error)
        record.finishedAt = Date.now()
        record.durationMs = record.finishedAt - record.startedAt
        options?.onUpdate?.({ ...record })
        return record
      }
    },

    listLogs() {
      return [...logs]
    },

    clearLogs() {
      logs.splice(0, logs.length)
    },
  }
}

const normalizeText = (value: unknown) => String(value ?? '').trim().toLowerCase()

export function createDefaultToolRuntime(params?: {
  memoryStore?: ReturnType<typeof useMemoryStore>
  knowledgeBaseStore?: ReturnType<typeof useKnowledgeBaseStore>
  enableCodeExecution?: boolean
}) {
  const runtime = createToolRuntime()

  runtime.register({
    name: 'search_knowledge',
    description: '搜索知识库内容，返回最相关的段落',
    schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '搜索关键词' },
        knowledgeBaseId: { type: 'string', description: '可选：指定知识库 ID' },
        topK: { type: 'number', description: '返回条数，建议 1-10' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    execute: ({ query, knowledgeBaseId, topK }) => {
      const kbStore = params?.knowledgeBaseStore
      if (!kbStore) {
        throw new Error('知识库工具不可用：knowledgeBaseStore 未注入')
      }
      const q = normalizeText(query)
      if (!q) return []
      const limit = Math.max(1, Math.min(10, Number(topK) || 5))
      const kbs = kbStore.knowledgeBases.filter((kb) => kb.status === 'active' && kb.indexStatus === 'ready' && (!knowledgeBaseId || kb.id === knowledgeBaseId))
      const kbMap = new Map(kbs.map((kb) => [kb.id, kb]))
      const docs = kbStore.documents.filter((doc) => doc.status === 'ready' && kbMap.has(doc.knowledgeBaseId))
      const docMap = new Map(docs.map((doc) => [doc.id, doc]))

      return kbStore.chunks
        .filter((chunk) => chunk.status === 'indexed' && kbMap.has(chunk.knowledgeBaseId) && docMap.has(chunk.documentId))
        .map((chunk) => {
          const content = normalizeText(chunk.content)
          const score = q && content.includes(q) ? 1 : q.split(/\s+/).filter(Boolean).reduce((acc, token) => acc + (content.includes(token) ? 1 : 0), 0)
          const doc = docMap.get(chunk.documentId)
          const kb = kbMap.get(chunk.knowledgeBaseId)
          return {
            chunkId: chunk.id,
            chunkIndex: chunk.chunkIndex,
            documentId: chunk.documentId,
            documentTitle: doc?.title,
            knowledgeBaseId: chunk.knowledgeBaseId,
            knowledgeBaseName: kb?.name,
            sourceLabel: `${kb?.name || '知识库'} / ${doc?.title || '文档'}`,
            score,
            content: chunk.content.slice(0, 320),
          }
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
    },
  })

  runtime.register({
    name: 'query_documents',
    description: '按关键词查询文档列表与状态',
    schema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: '文档标题关键词，可为空' },
        knowledgeBaseId: { type: 'string', description: '可选：指定知识库 ID' },
      },
      additionalProperties: false,
    },
    execute: ({ keyword, knowledgeBaseId }) => {
      const kbStore = params?.knowledgeBaseStore
      if (!kbStore) {
        throw new Error('文档查询工具不可用：knowledgeBaseStore 未注入')
      }
      const key = normalizeText(keyword)
      return kbStore.documents
        .filter((doc) => !knowledgeBaseId || doc.knowledgeBaseId === knowledgeBaseId)
        .filter((doc) => !key || normalizeText(doc.title).includes(key))
        .slice(0, 20)
        .map((doc) => ({
          id: doc.id,
          title: doc.title,
          knowledgeBaseId: doc.knowledgeBaseId,
          status: doc.status,
          chunkCount: doc.chunkCount,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        }))
    },
  })

  runtime.register({
    name: 'memory_read',
    description: '读取长期记忆，可按类型、关键词和最小权重过滤',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: '记忆类型：profile/preference/fact/task/summary' },
        keyword: { type: 'string', description: '匹配 key 或 value 的关键词' },
        minWeight: { type: 'number', description: '最小权重 0-1' },
        limit: { type: 'number', description: '返回条数，建议 1-20' },
      },
      additionalProperties: false,
    },
    execute: ({ type, keyword, minWeight, limit }) => {
      const memoryStore = params?.memoryStore
      if (!memoryStore) {
        throw new Error('记忆工具不可用：memoryStore 未注入')
      }
      const normalizedKeyword = normalizeText(keyword)
      const normalizedType = normalizeText(type)
      const allowedTypes: MemoryType[] = ['profile', 'preference', 'fact', 'task', 'summary']
      const typeFilter = allowedTypes.includes(normalizedType as MemoryType) ? (normalizedType as MemoryType) : undefined
      const maxRows = Math.max(1, Math.min(20, Number(limit) || 8))
      return memoryStore
        .list({ type: typeFilter, minWeight: typeof minWeight === 'number' ? minWeight : undefined })
        .filter((item) => {
          if (!normalizedKeyword) return true
          return normalizeText(item.key).includes(normalizedKeyword) || normalizeText(item.value).includes(normalizedKeyword)
        })
        .slice(0, maxRows)
        .map((item) => ({
          id: item.id,
          type: item.type,
          key: item.key,
          value: item.value,
          weight: item.weight,
          source: item.source,
          updatedAt: item.updatedAt,
        }))
    },
  })

  runtime.register({
    name: 'memory_write',
    description: '写入长期记忆，支持 profile/preference/fact/task/summary',
    schema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: '记忆类型：profile/preference/fact/task/summary', required: true },
        key: { type: 'string', description: '记忆键', required: true },
        value: { type: 'string', description: '记忆值', required: true },
        weight: { type: 'number', description: '权重 0-1' },
      },
      required: ['type', 'key', 'value'],
      additionalProperties: false,
    },
    execute: ({ type, key, value, weight }) => {
      const memoryStore = params?.memoryStore
      if (!memoryStore) {
        throw new Error('记忆工具不可用：memoryStore 未注入')
      }
      const normalizedType = normalizeText(type) as MemoryType
      const allowedTypes: MemoryType[] = ['profile', 'preference', 'fact', 'task', 'summary']
      if (!allowedTypes.includes(normalizedType)) {
        throw new Error(`不支持的记忆类型: ${type}`)
      }
      const entry = memoryStore.upsert({
        type: normalizedType,
        key: String(key),
        value: String(value),
        weight: typeof weight === 'number' ? weight : 0.7,
        source: 'assistant',
        merge: true,
      })
      return {
        ok: true,
        id: entry.id,
        type: entry.type,
        key: entry.key,
        value: entry.value,
        weight: entry.weight,
      }
    },
  })

  runtime.register({
    name: 'execute_code',
    description: '执行简单 JavaScript 表达式（仅当启用）',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'JavaScript 表达式，例如 1+1', required: true },
      },
      required: ['code'],
      additionalProperties: false,
    },
    execute: ({ code }) => {
      if (!params?.enableCodeExecution) {
        throw new Error('代码执行工具未启用')
      }
      const snippet = String(code)
      if (snippet.length > 300) {
        throw new Error('代码过长，最多 300 字符')
      }
      if (/\b(fetch|XMLHttpRequest|window|document|localStorage|sessionStorage|import|while\s*\(|for\s*\()\b/.test(snippet)) {
        throw new Error('包含受限语句，仅支持纯计算表达式')
      }
      const result = Function(`"use strict"; return (${snippet});`)()
      return {
        result,
        resultType: typeof result,
      }
    },
  })

  return runtime
}
