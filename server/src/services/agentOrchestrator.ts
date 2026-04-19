import { streamChat } from './openai.js'
import { buildRetrievalContext, inferMemoryRulesWithModel, applyMemoryRulesToUser } from './rag.js'
import { memoryStorage } from './memoryStore.js'
import type { AgentRecord } from './agents.js'
import type { RetrievalHit } from './rag.js'

interface OrchestratorInput {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  userId?: number | string
  agent?: AgentRecord
  model?: string
  temperature?: number
  provider?: 'openai' | 'ollama'
  knowledgeBaseId?: string
  knowledgeBaseName?: string
}

interface Citation {
  id: string
  chunkId?: string
  chunkIndex?: number
  documentId?: string
  documentTitle?: string
  knowledgeBaseId?: string
  knowledgeBaseName?: string
  sourceLabel?: string
  content: string
  summary: string
  score: number
  weight?: number
}

const buildSummary = (text: string) => {
  const clean = text.trim()
  if (!clean) return '暂无 chunk 摘要'
  return clean.length > 180 ? `${clean.slice(0, 180)}...` : clean
}

export class AgentOrchestrator {
  constructor(private readonly input: OrchestratorInput) {}

  private get ragEnabled() {
    return this.input.agent?.ragEnabled ?? true
  }

  private get memoryEnabled() {
    return this.input.agent?.memoryEnabled ?? true
  }

  private get toolEnabled() {
    return this.input.agent?.toolEnabled ?? false
  }

  private get systemPrompt() {
    return this.input.agent?.systemPrompt || '你是一个智能对话助手。'
  }

  private get maxTokens() {
    return this.input.agent?.maxTokens
  }

  private get effectiveTemperature() {
    return typeof this.input.temperature === 'number'
      ? this.input.temperature
      : this.input.agent?.temperature
  }

  private get lastUserMessage() {
    return [...(this.input.messages || [])].reverse().find((m) => m.role === 'user')?.content || ''
  }

  private async retrieveHits(): Promise<RetrievalHit[]> {
    if (!this.ragEnabled || !this.lastUserMessage) return []
    return buildRetrievalContext(this.lastUserMessage, 5, {
      knowledgeBaseId: this.input.knowledgeBaseId || this.input.agent?.defaultKnowledgeBaseId,
    })
  }

  private getMemoryContext() {
    if (!this.memoryEnabled || !this.input.userId) return [] as string[]
    return memoryStorage
      .list(this.input.userId)
      .slice(0, 10)
      .map((m) => `- [${m.type}] ${m.key}: ${m.value}`)
  }

  private buildCitations(retrievalHits: RetrievalHit[]): Citation[] {
    return retrievalHits.map((hit) => ({
      id: hit.id,
      chunkId: hit.metadata?.chunkId || hit.id,
      chunkIndex: hit.metadata?.chunkIndex ?? hit.metadata?.index ?? 0,
      documentId: hit.metadata?.documentId,
      documentTitle: hit.metadata?.documentTitle || hit.metadata?.sourceLabel || '引用来源',
      knowledgeBaseId: hit.metadata?.knowledgeBaseId || this.input.knowledgeBaseId || this.input.agent?.defaultKnowledgeBaseId,
      knowledgeBaseName: hit.metadata?.knowledgeBaseName || this.input.knowledgeBaseName,
      sourceLabel: hit.metadata?.sourceLabel || hit.metadata?.documentTitle || hit.metadata?.knowledgeBaseName || 'retrieval',
      content: hit.text,
      summary: buildSummary(hit.text),
      score: hit.score,
      weight: hit.metadata?.weight ?? 1,
    }))
  }

  private buildPromptContext(retrievalHits: RetrievalHit[]) {
    const retrievalContext = retrievalHits.length
      ? `检索上下文：\n${retrievalHits.map((hit) => `- (${hit.score.toFixed(3)}) ${hit.text}`).join('\n')}`
      : '检索上下文：无'

    const memoryContextItems = this.getMemoryContext()
    const memoryContext = memoryContextItems.length
      ? `长期记忆：\n${memoryContextItems.join('\n')}`
      : '长期记忆：无'

    const toolContext = `工具能力：${this.toolEnabled ? '已启用（当前未接入具体工具调用）' : '未启用'}`

    const configContext = this.input.agent
      ? `Agent 配置：name=${this.input.agent.name}, temperature=${this.input.agent.temperature}, maxTokens=${this.input.agent.maxTokens}, memory=${this.input.agent.memoryEnabled}, rag=${this.input.agent.ragEnabled}, tool=${this.input.agent.toolEnabled}, defaultKB=${this.input.agent.defaultKnowledgeBaseId || '-'} `
      : 'Agent 配置：默认'

    return [this.systemPrompt, retrievalContext, memoryContext, toolContext, configContext].join('\n\n')
  }

  async *stream() {
    const retrievalHits = await this.retrieveHits()
    const citations = this.buildCitations(retrievalHits)

    const enhancedMessages = [
      { role: 'system' as const, content: this.buildPromptContext(retrievalHits) },
      ...(this.input.messages || []),
    ]

    let fullText = ''
    for await (const chunk of streamChat(enhancedMessages, {
      model: this.input.model,
      temperature: this.effectiveTemperature,
      maxTokens: this.maxTokens,
      provider: this.input.provider || 'openai',
    })) {
      fullText += chunk
      yield { type: 'chunk' as const, content: chunk }
    }

    if (this.input.userId && this.memoryEnabled) {
      const rules = await inferMemoryRulesWithModel(this.input.messages || [])
      applyMemoryRulesToUser(this.input.userId, rules)
    }

    yield {
      type: 'done' as const,
      assistantMessage: {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant' as const,
        content: fullText,
        metadata: { citations },
      },
    }
  }
}
