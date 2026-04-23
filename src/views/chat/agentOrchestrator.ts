import { api } from '@/service/api'
import type { AgentConfig } from '@/store/agent'
import type { useKnowledgeBaseStore } from '@/store/knowledgeBase'
import type { useMemoryStore } from '@/store/memory'
import type { ChatConversation, ChatMessageMetadata } from '@/types/chat'
import { DEFAULT_SYSTEM_PROMPT } from './chatSession'
import { createDefaultToolRuntime, type ToolCallRecord, type ToolRuntime } from './toolProtocol'

export type RagStrategy = 'bm25' | 'vector' | 'hybrid'

interface RetrievalHit {
  id: string
  chunkId: string
  chunkIndex?: number
  documentId: string
  documentTitle?: string
  knowledgeBaseId: string
  knowledgeBaseName?: string
  sourceLabel?: string
  content: string
  score: number
  weight?: number
}

interface RetrievalContext {
  query: string
  knowledgeBaseId?: string | null
  limit: number
}

interface CachedRetrievalEntry {
  hits: RetrievalHit[]
  expiresAt: number
}

interface RagRetriever {
  id: RagStrategy
  label: string
  retrieve: (context: RetrievalContext) => RetrievalHit[]
}

interface ToolCallPlan {
  name: string
  input: Record<string, unknown>
  reason?: string
}

export interface AgentOrchestratorCallbacks {
  onChunk: (chunk: string) => void
  onMeta?: (meta: ChatMessageMetadata) => void
  onDone: (fullText: string) => void
  onError: (error: Error) => void
}

export interface AgentOrchestratorRunParams {
  userId?: number | string
  agent?: AgentConfig | null
  conversation: ChatConversation
  recentMessages: ChatConversation['messages']
  knowledgeBaseId?: string | null
  signal?: AbortSignal
  callbacks: AgentOrchestratorCallbacks
}

const simulateEmbedding = (text: string) => {
  const seed = text.slice(0, 512)
  return Array.from({ length: 16 }, (_, i) => {
    const code = seed.charCodeAt(i % Math.max(1, seed.length)) || 0
    return Number((((code + i * 17) % 101) / 100).toFixed(4))
  })
}

const cosineSimilarity = (a: number[], b: number[]) => {
  const len = Math.min(a.length, b.length)
  if (!len) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  if (!denom) return 0
  return dot / denom
}

const normalizeQuery = (query: string) =>
  query
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export class AgentOrchestrator {
  private readonly memoryStore: ReturnType<typeof useMemoryStore>
  private readonly knowledgeBaseStore: ReturnType<typeof useKnowledgeBaseStore>
  private readonly toolRuntime: ToolRuntime
  private ragStrategy: RagStrategy = 'hybrid'
  private emitToolMeta: ((toolCall: ToolCallRecord) => void) | null = null
  private readonly chunkCache = new Map<string, ReturnType<AgentOrchestrator['getCandidateChunks']>>()
  private readonly retrievalCache = new Map<string, CachedRetrievalEntry>()
  private readonly retrievalCacheTTL = 45 * 1000

  constructor(params: {
    memoryStore: ReturnType<typeof useMemoryStore>
    knowledgeBaseStore: ReturnType<typeof useKnowledgeBaseStore>
    toolRuntime?: ToolRuntime
    ragStrategy?: RagStrategy
  }) {
    this.memoryStore = params.memoryStore
    this.knowledgeBaseStore = params.knowledgeBaseStore
    this.toolRuntime = params.toolRuntime || createDefaultToolRuntime({
      memoryStore: this.memoryStore,
      knowledgeBaseStore: this.knowledgeBaseStore,
      enableCodeExecution: false,
    })
    this.ragStrategy = params.ragStrategy || 'hybrid'
  }

  setRagStrategy(strategy: RagStrategy) {
    this.ragStrategy = strategy
  }

  getRagStrategy() {
    return this.ragStrategy
  }

  getAvailableRagStrategies() {
    return [
      { id: 'bm25' as const, label: 'BM25（关键词）' },
      { id: 'vector' as const, label: 'Vector（向量）' },
      { id: 'hybrid' as const, label: 'Hybrid（混合）' },
    ]
  }

  getToolCallLogs() {
    return this.toolRuntime.listLogs()
  }

  private buildMemoryContext(enabled: boolean) {
    if (!enabled) return [] as string[]
    return this.memoryStore
      .list({ minWeight: 0.55 })
      .slice(0, 8)
      .map((item) => `[${item.type}] ${item.key}: ${typeof item.value === 'string' ? item.value : JSON.stringify(item.value)}`)
  }

  private getCandidateChunks(knowledgeBaseId?: string | null) {
    const version = `${this.knowledgeBaseStore.knowledgeBases.length}:${this.knowledgeBaseStore.documents.length}:${this.knowledgeBaseStore.chunks.length}`
    const cacheKey = `${knowledgeBaseId || 'all'}:${version}`
    const cached = this.chunkCache.get(cacheKey)
    if (cached) return cached

    const candidateKbs = this.knowledgeBaseStore.knowledgeBases.filter((kb) => {
      if (kb.status !== 'active' || kb.indexStatus !== 'ready') return false
      if (knowledgeBaseId) return kb.id === knowledgeBaseId
      return true
    })
    const kbMap = new Map(candidateKbs.map((kb) => [kb.id, kb]))
    const docs = this.knowledgeBaseStore.documents.filter(
      (doc) => doc.status === 'ready' && kbMap.has(doc.knowledgeBaseId),
    )
    const docMap = new Map(docs.map((doc) => [doc.id, doc]))

    const built = this.knowledgeBaseStore.chunks
      .filter((chunk) => chunk.status === 'indexed' && docMap.has(chunk.documentId) && kbMap.has(chunk.knowledgeBaseId))
      .map((chunk) => {
        const doc = docMap.get(chunk.documentId)
        const kb = kbMap.get(chunk.knowledgeBaseId)
        return {
          chunk,
          doc,
          kb,
        }
      })

    this.chunkCache.clear()
    this.chunkCache.set(cacheKey, built)
    return built
  }

  private scoreKeyword(query: string, content: string) {
    const q = query.toLowerCase().trim()
    const c = content.toLowerCase()
    if (!q || !c) return 0
    let score = 0
    if (c.includes(q)) score += 1
    const tokens = q.split(/\s+/).filter(Boolean)
    if (!tokens.length) return score
    const hit = tokens.filter((token) => c.includes(token)).length
    score += hit / tokens.length
    return Number(score.toFixed(4))
  }

  private retrieveByBm25(context: RetrievalContext): RetrievalHit[] {
    const normalizedQuery = normalizeQuery(context.query)
    const cacheKey = `bm25:${context.knowledgeBaseId || 'all'}:${context.limit}:${normalizedQuery}`
    const cached = this.retrievalCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.hits
    if (cached) this.retrievalCache.delete(cacheKey)

    const result = this.getCandidateChunks(context.knowledgeBaseId)
      .map(({ chunk, doc, kb }) => {
        const score = this.scoreKeyword(normalizedQuery, chunk.content)
        return {
          id: `${chunk.id}_${Date.now()}`,
          chunkId: chunk.id,
          chunkIndex: chunk.chunkIndex,
          documentId: chunk.documentId,
          documentTitle: doc?.title,
          knowledgeBaseId: chunk.knowledgeBaseId,
          knowledgeBaseName: kb?.name,
          sourceLabel: `${kb?.name || '知识库'} / ${doc?.title || '文档'}`,
          content: chunk.content,
          score,
          weight: score,
        } as RetrievalHit
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, context.limit)

    this.retrievalCache.set(cacheKey, { hits: result, expiresAt: Date.now() + this.retrievalCacheTTL })
    if (this.retrievalCache.size > 120) {
      const now = Date.now()
      for (const [key, entry] of this.retrievalCache.entries()) {
        if (entry.expiresAt <= now) this.retrievalCache.delete(key)
      }
      if (this.retrievalCache.size > 120) {
        const firstKey = this.retrievalCache.keys().next().value
        if (firstKey) this.retrievalCache.delete(firstKey)
      }
    }
    return result
  }

  private retrieveByVector(context: RetrievalContext): RetrievalHit[] {
    const normalizedQuery = normalizeQuery(context.query)
    const cacheKey = `vector:${context.knowledgeBaseId || 'all'}:${context.limit}:${normalizedQuery}`
    const cached = this.retrievalCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.hits
    if (cached) this.retrievalCache.delete(cacheKey)

    const queryVector = simulateEmbedding(normalizedQuery)
    const result = this.getCandidateChunks(context.knowledgeBaseId)
      .map(({ chunk, doc, kb }) => {
        const vector = chunk.vector?.length ? chunk.vector : simulateEmbedding(chunk.content)
        const score = Number(cosineSimilarity(queryVector, vector).toFixed(4))
        return {
          id: `${chunk.id}_${Date.now()}`,
          chunkId: chunk.id,
          chunkIndex: chunk.chunkIndex,
          documentId: chunk.documentId,
          documentTitle: doc?.title,
          knowledgeBaseId: chunk.knowledgeBaseId,
          knowledgeBaseName: kb?.name,
          sourceLabel: `${kb?.name || '知识库'} / ${doc?.title || '文档'}`,
          content: chunk.content,
          score,
          weight: score,
        } as RetrievalHit
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, context.limit)

    this.retrievalCache.set(cacheKey, { hits: result, expiresAt: Date.now() + this.retrievalCacheTTL })
    if (this.retrievalCache.size > 120) {
      const now = Date.now()
      for (const [key, entry] of this.retrievalCache.entries()) {
        if (entry.expiresAt <= now) this.retrievalCache.delete(key)
      }
      if (this.retrievalCache.size > 120) {
        const firstKey = this.retrievalCache.keys().next().value
        if (firstKey) this.retrievalCache.delete(firstKey)
      }
    }
    return result
  }

  private retrieveByHybrid(context: RetrievalContext): RetrievalHit[] {
    const bm25Hits = this.retrieveByBm25({ ...context, limit: context.limit * 3 })
    const vectorHits = this.retrieveByVector({ ...context, limit: context.limit * 3 })
    const merged = new Map<string, RetrievalHit>()

    bm25Hits.forEach((hit) => {
      merged.set(hit.chunkId, { ...hit, score: hit.score * 0.55 })
    })

    vectorHits.forEach((hit) => {
      const existed = merged.get(hit.chunkId)
      if (existed) {
        existed.score = Number((existed.score + hit.score * 0.45).toFixed(4))
        existed.weight = existed.score
      } else {
        merged.set(hit.chunkId, { ...hit, score: Number((hit.score * 0.45).toFixed(4)), weight: hit.score * 0.45 })
      }
    })

    return [...merged.values()]
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, context.limit)
  }

  private getRetriever(): RagRetriever {
    const retrievers: Record<RagStrategy, RagRetriever> = {
      bm25: { id: 'bm25', label: 'BM25（关键词）', retrieve: (context) => this.retrieveByBm25(context) },
      vector: { id: 'vector', label: 'Vector（向量）', retrieve: (context) => this.retrieveByVector(context) },
      hybrid: { id: 'hybrid', label: 'Hybrid（混合）', retrieve: (context) => this.retrieveByHybrid(context) },
    }
    return retrievers[this.ragStrategy]
  }

  private parseToolPlan(raw: string): ToolCallPlan | null {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    if (!cleaned) return null

    try {
      const parsed = JSON.parse(cleaned)
      if (!parsed || parsed.type !== 'tool_call') return null
      if (!parsed.name || typeof parsed.name !== 'string') return null
      const input = parsed.input && typeof parsed.input === 'object' ? parsed.input : {}
      return {
        name: parsed.name,
        input,
        reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
      }
    } catch {
      return null
    }
  }

  private async inferToolCallPlan(userInput: string, params: AgentOrchestratorRunParams): Promise<ToolCallPlan | null> {
    const toolSchemas = this.toolRuntime.getToolSchema()
    if (!toolSchemas.length) return null

    const plannerMessages = [
      {
        role: 'system' as const,
        content: [
          '你是工具调用规划器。',
          '请判断用户问题是否需要工具调用。',
          '如果需要，严格返回 JSON：{"type":"tool_call","name":"工具名","input":{...},"reason":"..."}',
          '如果不需要，返回 JSON：{"type":"no_tool"}',
          `可用工具：${JSON.stringify(toolSchemas)}`,
        ].join('\n'),
      },
      {
        role: 'user' as const,
        content: userInput,
      },
    ]

    const planText = await api.gpt.chat(plannerMessages)
    return this.parseToolPlan(planText)
  }

  private async runToolWithFunctionCalling(userInput: string, params: AgentOrchestratorRunParams): Promise<ToolCallRecord | null> {
    if (!(params.agent?.toolEnabled ?? true)) return null

    const plan = await this.inferToolCallPlan(userInput, params)
    if (!plan) return null

    const callId = `tool_call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    return this.toolRuntime.invoke(plan.name, plan.input || {}, {
      userId: params.userId,
      conversationId: params.conversation.id,
      agentId: params.agent?.id,
      requestedAt: Date.now(),
    }, {
      callId,
      onUpdate: (record) => {
        this.emitToolMeta?.(record)
      },
    })
  }

  private buildPrompt(params: AgentOrchestratorRunParams, retrievalHits: RetrievalHit[], toolCall: ToolCallRecord | null) {
    const memoryEnabled = params.agent?.memoryEnabled ?? true
    const ragEnabled = params.agent?.ragEnabled ?? true
    const toolEnabled = params.agent?.toolEnabled ?? true

    const systemPrompt = params.agent?.systemPrompt || DEFAULT_SYSTEM_PROMPT
    const memoryLines = this.buildMemoryContext(memoryEnabled)

    const retrievalSection = ragEnabled && retrievalHits.length
      ? `知识检索结果（优先参考，并在回答中尽量引用事实）：\n${retrievalHits
          .map((hit, index) => `[${index + 1}] ${hit.sourceLabel}（score=${hit.score}）\n${hit.content.slice(0, 280)}`)
          .join('\n\n')}`
      : ''

    const toolSection = toolEnabled && toolCall
      ? `工具调用日志：\n${JSON.stringify(toolCall)}`
      : ''

    const toolSchemaSection = toolEnabled
      ? `可用工具：${JSON.stringify(this.toolRuntime.getToolSchema())}`
      : ''

    const contextSystems = [
      memoryLines.length ? `长期记忆：\n${memoryLines.join('\n')}` : '',
      params.conversation.summary ? `会话摘要：${params.conversation.summary}` : '',
      retrievalSection,
      toolSchemaSection,
      toolSection,
    ].filter(Boolean)

    return [
      { role: 'system' as const, content: systemPrompt },
      ...contextSystems.map((content) => ({ role: 'system' as const, content })),
      ...params.recentMessages.map((message) => ({
        role: message.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: message.content,
      })),
    ]
  }

  async streamReply(params: AgentOrchestratorRunParams) {
    const latestUserMessage = [...params.conversation.messages].reverse().find((item) => item.role === 'user')
    const userInput = latestUserMessage?.content || ''

    const retriever = this.getRetriever()
    let retrievalHits: RetrievalHit[] = []
    if (params.agent?.ragEnabled ?? true) {
      try {
        retrievalHits = retriever.retrieve({ query: userInput, knowledgeBaseId: params.knowledgeBaseId, limit: 5 })
      } catch (error) {
        console.warn('[chat] retrieval failed, fallback to no-rag mode', error)
        retrievalHits = []
      }
    }

    this.emitToolMeta = (toolCallRecord) => {
      params.callbacks.onMeta?.({
        source: 'assistant',
        toolCalls: [toolCallRecord],
      })
    }

    const toolCall = await this.runToolWithFunctionCalling(userInput, params)

    const chatMessages = this.buildPrompt(params, retrievalHits, toolCall)

    params.callbacks.onMeta?.({
      source: 'assistant',
      retrieval: {
        hits: retrievalHits,
        citations: retrievalHits,
      },
      ragStrategy: retriever.id,
      toolCalls: toolCall ? [toolCall] : [],
    })

    try {
      await api.gpt.streamChatSSE(
        chatMessages,
        {
          onChunk: params.callbacks.onChunk,
          onMeta: (meta) => {
            const citations = (meta?.metadata?.citations || meta?.citations || retrievalHits || []) as RetrievalHit[]
            params.callbacks.onMeta?.({
              source: 'assistant',
              retrieval: {
                hits: citations,
                citations,
              },
              ragStrategy: retriever.id,
              toolCalls: toolCall ? [toolCall] : [],
            })
          },
          onDone: params.callbacks.onDone,
          onError: params.callbacks.onError,
        },
        {
          userId: params.userId,
          agentId: params.agent?.id,
          knowledgeBaseId: params.knowledgeBaseId || undefined,
          temperature: params.agent?.temperature,
          model: undefined,
          signal: params.signal,
        },
      )
    } finally {
      this.emitToolMeta = null
    }
  }
}

export function createAgentOrchestrator(params: {
  memoryStore: ReturnType<typeof useMemoryStore>
  knowledgeBaseStore: ReturnType<typeof useKnowledgeBaseStore>
  toolRuntime?: ToolRuntime
  ragStrategy?: RagStrategy
}) {
  return new AgentOrchestrator(params)
}
