import type { ChatConversation, ChatMessage } from '@/types/chat'

export const CHAT_CONVERSATIONS_STORAGE_KEY = 'ai-chat-conversations'
export const CHAT_CONTEXT_LIMIT = 14
export const CHAT_SUMMARY_TRIGGER_COUNT = 18

export const DEFAULT_WELCOME_MESSAGE = '你好，我是你的智能体助手。你可以直接开始提问。'
export const DEFAULT_SYSTEM_PROMPT = '你是一个通用智能体助手，负责帮助用户回答问题、整理信息、给出建议和持续对话。请保持自然、友好、专业。不要把自己描述成面试官、考官或评估者。'

export const DEFAULT_AI_AVATAR =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPGRlZnM+CiAgICA8bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwIiB5MT0iMCIgeDI9IjEiIHkyPSIxIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzQwOWVmZiIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMxZDhjZjgiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgPC9kZWZzPgogIDxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjUwIiBmaWxsPSJ1cmwoI2cpIi8+CiAgPHRleHQgeD0iNTAiIHk9IjU3IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjQ4IiBmaWxsPSJ3aGl0ZSI+T0E8L3RleHQ+Cjwvc3ZnPg=='

export function createAssistantMessage(params: {
  conversationId: string
  id: string
  content: string
  status: ChatMessage['status']
  createdAt: number
  sequence: number
  metadata?: ChatMessage['metadata']
}): ChatMessage {
  return {
    id: params.id,
    conversationId: params.conversationId,
    role: 'assistant',
    content: params.content,
    status: params.status,
    createdAt: params.createdAt,
    updatedAt: params.createdAt,
    timestamp: params.createdAt,
    sequence: params.sequence,
    metadata: params.metadata,
  }
}

export function createUserMessage(params: {
  conversationId: string
  id: string
  content: string
  createdAt: number
  sequence: number
  metadata?: ChatMessage['metadata']
}): ChatMessage {
  return {
    id: params.id,
    conversationId: params.conversationId,
    role: 'user',
    content: params.content,
    status: 'completed',
    createdAt: params.createdAt,
    updatedAt: params.createdAt,
    timestamp: params.createdAt,
    sequence: params.sequence,
    metadata: params.metadata,
  }
}

export function createConversation(params: {
  id: string
  title: string
  updatedAt: number
  agentId?: string
  summary?: string
  summaryUpdatedAt?: number
  messages?: ChatMessage[]
}): ChatConversation {
  return {
    id: params.id,
    title: params.title,
    updatedAt: params.updatedAt,
    agentId: params.agentId,
    summary: params.summary,
    summaryUpdatedAt: params.summaryUpdatedAt,
    messages: params.messages ?? [],
  }
}

export function getRecentMessages(messages: ChatMessage[], limit = CHAT_CONTEXT_LIMIT): ChatMessage[] {
  return messages.slice(Math.max(0, messages.length - limit))
}

export function needsSummary(messages: ChatMessage[]): boolean {
  return messages.length >= CHAT_SUMMARY_TRIGGER_COUNT
}

export function buildConversationSummary(conversation: ChatConversation): string {
  const recent = conversation.messages.slice(-CHAT_CONTEXT_LIMIT)
  const lines = recent
    .filter(message => message.status !== 'hidden')
    .map(message => {
      const roleLabel =
        message.role === 'user'
          ? '用户'
          : message.role === 'assistant'
            ? '助手'
            : message.role === 'tool'
              ? '工具'
              : message.role === 'retrieval'
                ? '检索'
                : '记忆'
      return `${roleLabel}: ${message.content}`
    })
  return lines.join('\n')
}
