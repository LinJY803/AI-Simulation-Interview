import { buildRetrievalContext } from './rag.js'

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'deepseek-v2'

export interface ChatMessageLike {
  role: 'system' | 'user' | 'assistant'
  content: string
}

async function fetchJson(url: string, init: RequestInit) {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(`Ollama 请求失败: ${res.status} ${res.statusText}`)
  }
  return res
}

export function buildOllamaMessages(messages: ChatMessageLike[]) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
  const retrieval = buildRetrievalContext(lastUser, 5)
  const systemPrompts = [
    '你是一个自然、友好、专业的对话智能体。',
    '优先利用长期记忆与检索上下文回答，不要重复提问已经知道的信息。',
    retrieval.length ? `检索上下文：\n${retrieval.join('\n')}` : '检索上下文：无',
  ]

  return [
    { role: 'system' as const, content: systemPrompts.join('\n\n') },
    ...messages,
  ]
}

export async function* streamChatWithOllama(messages: ChatMessageLike[], options?: { model?: string; temperature?: number }) {
  const response = await fetchJson(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options?.model || OLLAMA_MODEL,
      messages: buildOllamaMessages(messages),
      stream: true,
      options: { temperature: options?.temperature ?? 0.7 },
    }),
  })

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Ollama 响应流不可读')

  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const parsed = JSON.parse(trimmed)
        const chunk = parsed?.message?.content || parsed?.response || ''
        if (chunk) yield chunk as string
        if (parsed?.done) return
      } catch {
        continue
      }
    }
  }
}

export async function chatWithOllama(messages: ChatMessageLike[], options?: { model?: string; temperature?: number }) {
  let full = ''
  for await (const chunk of streamChatWithOllama(messages, options)) full += chunk
  return full
}
