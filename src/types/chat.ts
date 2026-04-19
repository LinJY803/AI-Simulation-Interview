export type ChatMessageRole = 'user' | 'assistant' | 'system' | 'tool' | 'retrieval' | 'memory'
export type ChatMessageStatus = 'queued' | 'streaming' | 'completed' | 'error' | 'hidden'

export interface ChatMessageMetadata {
  source?: 'user' | 'assistant' | 'system' | 'tool' | 'retrieval' | 'memory'
  toolName?: string
  toolArgs?: Record<string, unknown>
  toolResult?: unknown
  retrieval?: {
    query?: string
    sourceId?: string
    sourceName?: string
    chunkId?: string
    score?: number
    citations?: Array<{
      id?: string
      chunkId?: string
      chunkIndex?: number
      documentId?: string
      documentTitle?: string
      knowledgeBaseId?: string
      knowledgeBaseName?: string
      sourceLabel?: string
      content?: string
      score?: number
      weight?: number
    }>
    hits?: Array<{
      id?: string
      chunkId?: string
      chunkIndex?: number
      documentId?: string
      documentTitle?: string
      knowledgeBaseId?: string
      knowledgeBaseName?: string
      sourceLabel?: string
      content?: string
      score?: number
      weight?: number
    }>
  }
  memory?: {
    memoryId?: string
    memoryType?: 'profile' | 'preference' | 'fact' | 'task' | 'summary'
    importance?: number
  }
  [key: string]: unknown
}

export interface ChatMessage {
  id: string
  conversationId: string
  role: ChatMessageRole
  content: string
  status: ChatMessageStatus
  createdAt: number
  updatedAt?: number
  timestamp?: number
  parentId?: string | null
  sequence?: number
  isAudio?: boolean
  audioUrl?: string
  metadata?: ChatMessageMetadata
}

export interface ChatConversation {
  id: string
  title: string
  updatedAt: number
  agentId?: string
  summary?: string
  summaryUpdatedAt?: number
  messages: ChatMessage[]
}
