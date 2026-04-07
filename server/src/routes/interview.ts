/**
 * server/src/routes/interview.ts — 面试管理路由
 *
 * 接口列表：
 * POST   /api/interview/start          — 开始新面试
 * POST   /api/interview/:id/message     — 发送消息（获取 AI 回复）
 * POST   /api/interview/:id/end         — 结束面试（生成分析报告）
 * GET    /api/interview/history         — 面试历史列表（分页）
 * GET    /api/interview/:id             — 面试详情
 * DELETE /api/interview/:id             — 删除面试记录
 */

import { Router, type Request, type Response } from 'express'
import { interviewStorage, type InterviewRecord, type InterviewMessage } from '../services/storage.js'
import { authMiddleware } from './auth.js'
import { streamChat, analyzeInterview } from '../services/openai.js'

const router = Router()

// 所有面试接口需要登录
router.use(authMiddleware)

// ==================== POST /api/interview/start ====================
router.post('/start', (req: Request, res: Response) => {
  const { position, difficulty, duration } = req.body
  const userId = (req as any).user.userId

  const positionLabels: Record<string, string> = {
    frontend: '前端开发工程师',
    backend: '后端开发工程师',
    fullstack: '全栈工程师',
    mobile: '移动端开发工程师',
    algorithm: '算法工程师',
    qa: '测试工程师',
  }
  const diffLabels: Record<string, string> = { easy: '简单', medium: '中等', hard: '困难' }

  const title = `${positionLabels[position] || position} - ${diffLabels[difficulty] || '中等'}难度`

  const record = interviewStorage.create({
    id: `interview_${Date.now()}`,
    userId,
    title,
    position,
    difficulty,
    duration,
    startTime: Date.now(),
    endTime: 0,
    durationMs: 0,
    status: 'ongoing',
    messages: [],
  })

  res.json({
    code: 200,
    success: true,
    message: '面试已开始',
    data: { interviewId: record.id, status: 'started' },
  })
})

// ==================== POST /api/interview/:id/message ====================
router.post('/:id/message', async (req: Request, res: Response) => {
  const { id } = req.params
  const { content, audioData } = req.body

  const record = interviewStorage.findById(id)
  if (!record) {
    res.status(404).json({ code: 404, success: false, message: '面试记录不存在' })
    return
  }

  if (record.status !== 'ongoing') {
    res.status(400).json({ code: 400, success: false, message: '面试已结束' })
    return
  }

  // 1. 保存用户消息
  const userMsg: InterviewMessage = {
    id: `msg_${Date.now()}`,
    content,
    role: 'user',
    timestamp: Date.now(),
    isAudio: !!audioData,
  }
  record.messages.push(userMsg)
  interviewStorage.update(id, { messages: record.messages })

  // 2. 调用 AI 获取回复（非流式，直接返回完整文本）
  try {
    const chatMessages = record.messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    let aiContent = ''
    // 用 for-await 收集流式输出为完整文本
    for await (const chunk of streamChat(chatMessages)) {
      aiContent += chunk
    }

    const aiMsg: InterviewMessage = {
      id: `msg_${Date.now() + 1}`,
      content: aiContent,
      role: 'assistant',
      timestamp: Date.now(),
    }
    record.messages.push(aiMsg)
    interviewStorage.update(id, { messages: record.messages })

    res.json({
      code: 200,
      success: true,
      message: '请求成功',
      data: {
        id: aiMsg.id,
        role: aiMsg.role,
        content: aiMsg.content,
        timestamp: aiMsg.timestamp,
      },
    })
  } catch (error: any) {
    console.error('[Interview] AI 回复失败:', error.message)
    res.status(500).json({ code: 500, success: false, message: 'AI 回复生成失败' })
  }
})

// ==================== POST /api/interview/:id/end ====================
router.post('/:id/end', async (req: Request, res: Response) => {
  const { id } = req.params

  const record = interviewStorage.findById(id)
  if (!record) {
    res.status(404).json({ code: 404, success: false, message: '面试记录不存在' })
    return
  }

  if (record.status !== 'ongoing') {
    res.status(400).json({ code: 400, success: false, message: '面试已结束' })
    return
  }

  // 生成 AI 分析报告
  let analysis
  try {
    analysis = await analyzeInterview(record.messages)
  } catch (error: any) {
    console.error('[Interview] 分析报告生成失败:', error.message)
    analysis = {
      technicalScore: 3.0,
      communicationScore: 3.0,
      problemSolvingScore: 3.0,
      overallScore: 3.0,
      strengths: ['分析报告生成失败，使用默认评分'],
      weaknesses: [],
      suggestions: [],
    }
  }

  const now = Date.now()
  interviewStorage.update(id, {
    status: 'completed',
    endTime: now,
    durationMs: now - record.startTime,
    score: analysis.overallScore,
    analysis,
  })

  res.json({
    code: 200,
    success: true,
    message: '面试已结束',
    data: analysis,
  })
})

// ==================== GET /api/interview/history ====================
router.get('/history', (req: Request, res: Response) => {
  const userId = (req as any).user.userId
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 10

  // 查询当前用户的所有面试记录，按开始时间倒序
  let records = interviewStorage
    .filter((r) => r.userId === userId)
    .sort((a, b) => b.startTime - a.startTime)

  const total = records.length

  // 分页
  const start = (page - 1) * limit
  const list = records.slice(start, start + limit).map((r) => ({
    id: r.id,
    title: r.title,
    startTime: r.startTime,
    endTime: r.endTime,
    duration: r.durationMs,
    status: r.status,
    score: r.score || 0,
  }))

  res.json({ code: 200, success: true, message: '请求成功', data: { list, total, page, limit } })
})

// ==================== GET /api/interview/:id ====================
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const record = interviewStorage.findById(id)

  if (!record) {
    res.status(404).json({ code: 404, success: false, message: '面试记录不存在' })
    return
  }

  res.json({
    code: 200,
    success: true,
    message: '请求成功',
    data: {
      id: record.id,
      title: record.title,
      startTime: record.startTime,
      endTime: record.endTime,
      duration: record.durationMs,
      status: record.status,
      score: record.score || 0,
      messages: record.messages,
      analysis: record.analysis,
    },
  })
})

// ==================== DELETE /api/interview/:id ====================
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const userId = (req as any).user.userId

  const record = interviewStorage.findById(id)
  if (!record || record.userId !== userId) {
    res.status(404).json({ code: 404, success: false, message: '面试记录不存在' })
    return
  }

  interviewStorage.delete(id)
  res.json({ code: 200, success: true, message: '删除成功', data: { deleted: true } })
})

export default router
