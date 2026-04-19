/**
 * server/src/routes/gpt.ts — GPT / AI 相关路由
 */

import { Router, type Request, type Response } from 'express'
import { interviewStorage } from '../services/storage.js'
import { authMiddleware } from './auth.js'
import { analyzeInterview, speechToText, textToSpeech } from '../services/openai.js'
import { AgentOrchestrator } from '../services/agentOrchestrator.js'
import { agentStorage } from '../services/agents.js'
import { knowledgeBaseStore } from '../services/knowledgeBase.js'

const router = Router()
router.use(authMiddleware)

router.get('/agents', (req: Request, res: Response) => {
  const currentUserId = (req as any).user?.userId
  const list = agentStorage.list(currentUserId)
  res.json({ code: 200, success: true, message: '请求成功', data: list })
})

router.post('/agents', (req: Request, res: Response) => {
  const currentUserId = (req as any).user?.userId
  const {
    id,
    name,
    description,
    systemPrompt,
    temperature,
    maxTokens,
    memoryEnabled,
    ragEnabled,
    toolEnabled,
    defaultKnowledgeBaseId,
  } = req.body || {}

  if (!name || !systemPrompt) {
    return res.status(400).json({ code: 400, success: false, message: 'name 和 systemPrompt 为必填项' })
  }

  const saved = agentStorage.upsert({
    id,
    userId: currentUserId,
    name,
    description,
    systemPrompt,
    temperature: typeof temperature === 'number' ? temperature : 0.7,
    maxTokens: typeof maxTokens === 'number' ? maxTokens : 1200,
    memoryEnabled: typeof memoryEnabled === 'boolean' ? memoryEnabled : true,
    ragEnabled: typeof ragEnabled === 'boolean' ? ragEnabled : true,
    toolEnabled: typeof toolEnabled === 'boolean' ? toolEnabled : false,
    defaultKnowledgeBaseId,
  })

  return res.json({ code: 200, success: true, message: '保存成功', data: saved })
})

router.delete('/agents/:id', (req: Request, res: Response) => {
  const currentUserId = (req as any).user?.userId
  const item = agentStorage.list(currentUserId).find((agent) => agent.id === req.params.id)
  if (!item) return res.status(404).json({ code: 404, success: false, message: 'Agent 不存在' })
  agentStorage.remove(req.params.id)
  return res.json({ code: 200, success: true, message: '删除成功', data: { deleted: true } })
})

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
  const currentUserId = userId || (req as any).user?.userId
  const allAgents = agentStorage.list(currentUserId)
  const agent = agentId ? allAgents.find((item) => item.id === agentId) : allAgents[0]

  const selectedKnowledgeBaseId = knowledgeBaseId || agent?.defaultKnowledgeBaseId
  const kb = selectedKnowledgeBaseId ? knowledgeBaseStore.knowledgeBases.find((item) => item.id === selectedKnowledgeBaseId) : undefined

  const orchestrator = new AgentOrchestrator({
    messages: messages || [],
    userId: currentUserId,
    agent,
    model,
    temperature,
    provider: provider === 'ollama' ? 'ollama' : 'openai',
    knowledgeBaseId: selectedKnowledgeBaseId,
    knowledgeBaseName: kb?.name,
  })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  try {
    for await (const event of orchestrator.stream()) {
      if (event.type === 'chunk') {
        res.write(`data: ${JSON.stringify({ content: event.content })}\n\n`)
        continue
      }
      res.write(`data: ${JSON.stringify({ assistantMessage: event.assistantMessage })}\n\n`)
    }
    res.write('data: [DONE]\n\n')
  } catch (error: any) {
    const detail = {
      message: error?.message || 'AI 服务暂不可用',
      code: error?.code || 'AI_STREAM_ERROR',
      status: error?.status || error?.response?.status || 500,
      provider: provider === 'ollama' ? 'ollama' : 'openai',
      model,
    }
    console.error('[gpt/stream] 请求失败:', detail)
    if (!res.headersSent) {
      res.status(200)
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('X-Accel-Buffering', 'no')
      res.flushHeaders()
    }
    res.write(`data: ${JSON.stringify({ error: detail })}\n\n`)
    res.write('data: [DONE]\n\n')
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
