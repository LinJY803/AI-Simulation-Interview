import { memoryStorage } from './memoryStore.js'
import { vectorStore } from './vectorStore.js'

export type MemoryRuleType = 'profile' | 'preference' | 'fact' | 'task' | 'summary'

export interface MemoryRule {
  type: MemoryRuleType
  key: string
  value: string
  weight: number
  source: 'user' | 'assistant' | 'system' | 'derived' | 'model'
  confidence: number
}

export interface RetrievalHit {
  id: string
  text: string
  score: number
  metadata?: {
    recordId?: string
    index?: number
    knowledgeBaseId?: string
    knowledgeBaseName?: string
    documentId?: string
    documentTitle?: string
    chunkId?: string
    chunkIndex?: number
    sourceLabel?: string
    weight?: number
  }
}

const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim()
const hashKey = (type: MemoryRuleType, key: string) => `${type}:${normalize(key)}`

const mergeRules = (rules: MemoryRule[]) => {
  const map = new Map<string, MemoryRule>()
  for (const rule of rules) {
    const key = hashKey(rule.type, rule.key)
    const existing = map.get(key)
    if (!existing) { map.set(key, rule); continue }
    map.set(key, { ...existing, value: rule.value.length >= existing.value.length ? rule.value : existing.value, weight: Math.max(existing.weight, rule.weight), confidence: Math.max(existing.confidence, rule.confidence), source: rule.source })
  }
  return [...map.values()]
}

export function extractMemoryRules(messages: { role: 'user' | 'assistant'; content: string }[]): MemoryRule[] {
  const rules: MemoryRule[] = []
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')?.content || ''
  const profilePatterns = [
    { re: /我叫([\u4e00-\u9fa5A-Za-z0-9_\-]{2,20})/, key: 'name' },
    { re: /我来自([\u4e00-\u9fa5A-Za-z0-9_\-]{2,20})/, key: 'origin' },
    { re: /我(是|在做)(.+?)(?:，|。|,|$)/, key: 'role' },
    { re: /(前端|后端|全栈|算法|测试|产品|设计)工程师/, key: 'role' },
  ]
  for (const item of profilePatterns) { const match = lastUser.match(item.re); if (match?.[2] || match?.[1]) rules.push({ type: 'profile', key: item.key, value: (match[2] || match[1]).trim(), weight: 0.95, source: 'user', confidence: 0.9 }) }
  const preferencePatterns = [
    { re: /我喜欢([^。；,，]+)/, key: 'like' },
    { re: /我偏好([^。；,，]+)/, key: 'prefer' },
    { re: /我更喜欢([^。；,，]+)/, key: 'prefer_more' },
    { re: /我不喜欢([^。；,，]+)/, key: 'dislike' },
    { re: /我习惯([^。；,，]+)/, key: 'habit' },
  ]
  for (const item of preferencePatterns) { const match = lastUser.match(item.re); if (match?.[1]) rules.push({ type: 'preference', key: item.key, value: match[1].trim(), weight: 0.85, source: 'user', confidence: 0.8 }) }
  const taskPatterns = [/帮我([^。；,，]+)/, /请([^。；,，]+)/, /我想要([^。；,，]+)/, /我需要([^。；,，]+)/]
  for (const re of taskPatterns) { const match = lastUser.match(re); if (match?.[1]) rules.push({ type: 'task', key: 'active_request', value: match[1].trim(), weight: 0.98, source: 'user', confidence: 0.88 }) }
  if (lastAssistant) rules.push({ type: 'summary', key: 'last_answer_summary', value: lastAssistant.length > 40 ? lastAssistant.slice(0, 120) : lastAssistant, weight: 0.5, source: 'assistant', confidence: 0.55 })
  if (lastUser.includes('Vue') || lastUser.includes('React') || lastUser.includes('TypeScript')) rules.push({ type: 'fact', key: 'tech_stack', value: lastUser, weight: 0.72, source: 'user', confidence: 0.66 })
  return mergeRules(rules)
}

export async function inferMemoryRulesWithModel(messages: { role: 'user' | 'assistant'; content: string }[]) {
  const provider = process.env.LLM_PROVIDER || 'ollama'
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || ''
  const prompt = `你是记忆抽取器，只输出 JSON 数组。请从对话中提取可长期保存的信息，类型只能是 profile/preference/fact/task/summary。每条包含 type,key,value,weight,confidence,source。只保留稳定事实、偏好、目标、任务和摘要。\n\n对话：\n${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}\n\n最后一句：${lastUser}`
  try {
    if (provider === 'ollama') {
      const res = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OLLAMA_MODEL || 'deepseek-v2', stream: false, messages: [{ role: 'system', content: '你是记忆抽取器，只输出 JSON 数组。' }, { role: 'user', content: prompt }], options: { temperature: 0.1 } }) })
      if (!res.ok) throw new Error(`Ollama 抽取失败: ${res.status}`)
      const json = await res.json() as any
      const content = String(json?.message?.content || json?.response || '[]')
      const parsed = JSON.parse(content.replace(/```json|```/g, '').trim() || '[]')
      return Array.isArray(parsed) ? mergeRules(parsed) : extractMemoryRules(messages)
    }
    const baseURL = process.env.OPENAI_BASE_URL || process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1'
    const apiKey = process.env.OPENAI_API_KEY || process.env.SILICONFLOW_API_KEY || ''
    if (!apiKey) return extractMemoryRules(messages)
    const res = await fetch(`${baseURL}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || process.env.SILICONFLOW_MODEL || 'deepseek-chat', messages: [{ role: 'system', content: '你是记忆抽取器，只输出 JSON 数组。' }, { role: 'user', content: prompt }], temperature: 0.1 }) })
    if (!res.ok) throw new Error(`模型抽取失败: ${res.status}`)
    const json = await res.json() as any
    const content = String(json?.choices?.[0]?.message?.content || '[]')
    const parsed = JSON.parse(content.replace(/```json|```/g, '').trim() || '[]')
    return Array.isArray(parsed) ? mergeRules(parsed) : extractMemoryRules(messages)
  } catch { return extractMemoryRules(messages) }
}

export function applyMemoryRulesToUser(userId: number | string, rules: MemoryRule[]) {
  const merged = mergeRules(rules)
  return merged.map((rule) => memoryStorage.upsert({ userId, type: rule.type, key: rule.key, value: rule.value, weight: rule.weight, source: rule.source, confidence: rule.confidence, sourceId: undefined }))
}

export function indexChunksForRecord(recordId: string, chunks: string[], metadata?: { knowledgeBaseId?: string; knowledgeBaseName?: string; documentId?: string; documentTitle?: string }) {
  chunks.forEach((chunk, index) => {
    vectorStore.upsert({
      id: `${recordId}:${index}`,
      text: chunk,
      vector: vectorStore.embed(chunk),
      metadata: { recordId, index, chunkIndex: index, chunkId: `${recordId}:${index}`, sourceLabel: metadata?.documentTitle || recordId, weight: 1, ...metadata },
    })
  })
}

export function buildRetrievalContext(query: string, limit = 5): RetrievalHit[] {
  const vector = vectorStore.embed(query)
  return vectorStore.search(vector, limit).map((item) => ({ id: item.id, text: item.text, score: item.score, metadata: item.metadata as RetrievalHit['metadata'] | undefined }))
}
