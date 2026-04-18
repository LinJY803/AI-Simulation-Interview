/**
 * server/src/routes/gpt.ts — GPT / AI 相关路由
 */

import { Router, type Request, type Response } from 'express'
import { interviewStorage } from '../services/storage.js'
import { authMiddleware } from './auth.js'
import { streamChat, analyzeInterview, speechToText, textToSpeech } from '../services/openai.js'
import { buildRetrievalContext, inferMemoryRulesWithModel, applyMemoryRulesToUser } from '../services/rag.js'
import { memoryStorage } from '../services/memoryStore.js'
import { agentStorage } from '../services/agents.js'
import { knowledgeBaseStore } from '../services/knowledgeBase.js'

const router = Router()
router.use(authMiddleware)

router.get('/analysis/:id', async (req: Request, res: Response) => {
  const { id } = req.params
  const record = interviewStorage.findById(id)
  if (!record) return res.status(404).json({ code: 404, success: false, message: '面试记录不存在' })
  if (record.analysis) return res.json({ code: 200, success: true, message: '请求成功', data: record.analysis })
  try {
    const analysis = await analyzeInterview(record.messages)
    interviewStorage.update(id, { analysis, score: analysis.overallScore })
    res.json({ code: 200, success: true, message: '请求成功', data: analysis })
  } catch (error: any) {
    res.status(500).json({ code: 500, success: false, message: '分析报告生成失败: ' + error.message })
  }
})

router.post('/stream', async (req: Request, res: Response) => {
  const { messages, model, temperature, provider, userId, agentId, knowledgeBaseId } = req.body
  const lastUser = [...(messages || [])].reverse().find((m: any) => m.role === 'user')?.content || ''
  const retrievalHits = buildRetrievalContext(lastUser, 5)
  const agent = agentId ? agentStorage.list(userId).find((item) => item.id === agentId) : undefined
  const memoryHits = userId ? memoryStorage.list(userId).slice(0, 10) : []
  const kb = knowledgeBaseId ? knowledgeBaseStore.knowledgeBases.find((item) => item.id === knowledgeBaseId) : undefined

  const citations = retrievalHits.map((hit) => ({
    id: hit.id,
    chunkId: hit.metadata?.chunkId || hit.id,
    chunkIndex: hit.metadata?.chunkIndex ?? hit.metadata?.index ?? 0,
    documentId: hit.metadata?.documentId,
    documentTitle: hit.metadata?.documentTitle || hit.metadata?.sourceLabel || '引用来源',
    knowledgeBaseId: hit.metadata?.knowledgeBaseId || kb?.id,
    knowledgeBaseName: hit.metadata?.knowledgeBaseName || kb?.name,
    content: hit.text,
    score: hit.score,
    weight: hit.metadata?.weight ?? 1,
  }))

  const enhancedMessages = [
    {
      role: 'system' as const,
      content: [
        agent?.systemPrompt || '你是一个智能对话助手。',
        retrievalHits.length
          ? `检索上下文：\n${retrievalHits.map((hit) => `- (${hit.score.toFixed(3)}) ${hit.text}`).join('\n')}`
          : '检索上下文：无',
        memoryHits.length
          ? `长期记忆：\n${memoryHits.map((m) => `- [${m.type}] ${m.key}: ${m.value}`).join('\n')}`
          : '长期记忆：无',
        agent ? `Agent 配置：temperature=${agent.temperature}, maxTokens=${agent.maxTokens}, memory=${agent.memoryEnabled}, rag=${agent.ragEnabled}, tool=${agent.toolEnabled}` : 'Agent 配置：默认',
      ].join('\n\n'),
    },
    ...(messages || []),
  ]

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const assistantMessage = {
    id: `msg_${Date.now()}_assistant`,
    role: 'assistant' as const,
    content: '',
    metadata: { citations },
  }

  try {
    for await (const chunk of streamChat(enhancedMessages, { model, temperature, provider: provider === 'ollama' ? 'ollama' : 'openai' })) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`)
    }
    if (userId) {
      const rules = await inferMemoryRulesWithModel(messages || [])
      applyMemoryRulesToUser(userId, rules)
    }
    res.write(`data: ${JSON.stringify({ assistantMessage })}\n\n`)
    res.write('data: [DONE]\n\n')
  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
  } finally {
    res.end()
  }
})

router.post('/speech-to-text', async (req: Request, res: Response) => {
  try {
    const file = (req as any).file
    if (!file) {
      const { audioData } = req.body
      if (!audioData) return res.status(400).json({ code: 400, success: false, message: '请提供音频数据' })
      const buffer = Buffer.from(audioData, 'base64')
      const result = await speechToText(buffer, 'audio/webm')
      return res.json({ code: 200, success: true, message: '请求成功', data: result })
    }

    const result = await speechToText(file.buffer, file.mimetype)
    res.json({ code: 200, success: true, message: '请求成功', data: result })
  } catch (error: any) {
    res.status(500).json({ code: 500, success: false, message: '语音转文字失败: ' + error.message })
  }
})

router.post('/text-to-speech', async (req: Request, res: Response) => {
  const { text, voice } = req.body
  if (!text) return res.status(400).json({ code: 400, success: false, message: '请提供要转换的文本' })
  try {
    const audioBuffer = await textToSpeech(text, voice)
    if (audioBuffer.length === 0) return res.json({ code: 200, success: true, message: '请求成功', data: { url: 'mock_audio_url' } })
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Content-Length', audioBuffer.length)
    res.send(audioBuffer)
  } catch (error: any) {
    res.status(500).json({ code: 500, success: false, message: '文字转语音失败: ' + error.message })
  }
})

export default router
