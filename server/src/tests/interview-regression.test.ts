import test from 'node:test'
import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import express from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'ai-interview-jwt-secret-key-2024'

const buildToken = (userId = 1) =>
  jwt.sign({ userId, username: `u${userId}`, role: 'user' }, JWT_SECRET, { expiresIn: '1h' })

const jsonHeaders = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
})

const createAppServer = async () => {
  const { default: interviewRoutes } = await import('../routes/interview.js')
  const app = express()
  app.use(express.json({ limit: '1mb' }))
  app.use('/api/interview', interviewRoutes)

  const server = await new Promise<import('node:http').Server>((resolve) => {
    const s = app.listen(0, () => resolve(s))
  })

  const addr = server.address()
  if (!addr || typeof addr === 'string') {
    throw new Error('无法获取测试服务端口')
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${addr.port}`,
  }
}

// 先设置隔离数据目录，再加载依赖 storage 的模块
const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-interview-test-'))
process.env.DATA_DIR = testDataDir

test('单元测试：collectStreamText 能正确聚合流式分片', async () => {
  const { collectStreamText } = await import('../routes/interview.js')

  async function* mockStream() {
    yield '流式'
    yield '消息'
    yield '测试'
  }

  const text = await collectStreamText(mockStream())
  assert.equal(text, '流式消息测试')
})

test('接口/E2E：路由离开走 cancel，且取消接口幂等', async (t) => {
  const { server, baseUrl } = await createAppServer()
  t.after(() => server.close())

  const token = buildToken(777)

  const startRes = await fetch(`${baseUrl}/api/interview/start`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ position: 'frontend', difficulty: 'medium', duration: 30 }),
  })
  assert.equal(startRes.status, 200)
  const startJson = await startRes.json() as any
  const interviewId = startJson?.data?.interviewId
  assert.ok(interviewId)

  const cancelRes1 = await fetch(`${baseUrl}/api/interview/${interviewId}/cancel`, {
    method: 'POST',
    headers: jsonHeaders(token),
  })
  assert.equal(cancelRes1.status, 200)
  const cancelJson1 = await cancelRes1.json() as any
  assert.equal(cancelJson1?.data?.status, 'canceled')

  const cancelRes2 = await fetch(`${baseUrl}/api/interview/${interviewId}/cancel`, {
    method: 'POST',
    headers: jsonHeaders(token),
  })
  assert.equal(cancelRes2.status, 200)

  const endAfterCancelRes = await fetch(`${baseUrl}/api/interview/${interviewId}/end`, {
    method: 'POST',
    headers: jsonHeaders(token),
  })
  assert.equal(endAfterCancelRes.status, 400)
})

test('接口回归：自动结束接口幂等，不重复污染 completed 数据', async (t) => {
  const { server, baseUrl } = await createAppServer()
  t.after(() => server.close())

  const token = buildToken(778)

  const startRes = await fetch(`${baseUrl}/api/interview/start`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ position: 'backend', difficulty: 'easy', duration: 20 }),
  })
  assert.equal(startRes.status, 200)
  const startJson = await startRes.json() as any
  const interviewId = startJson?.data?.interviewId
  assert.ok(interviewId)

  const endRes1 = await fetch(`${baseUrl}/api/interview/${interviewId}/end`, {
    method: 'POST',
    headers: jsonHeaders(token),
  })
  assert.equal(endRes1.status, 200)
  const endJson1 = await endRes1.json() as any
  assert.equal(endJson1?.success, true)

  const detailRes1 = await fetch(`${baseUrl}/api/interview/${interviewId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  assert.equal(detailRes1.status, 200)
  const detailJson1 = await detailRes1.json() as any
  assert.equal(detailJson1?.data?.status, 'completed')
  const firstEndTime = detailJson1?.data?.endTime
  assert.ok(typeof firstEndTime === 'number' && firstEndTime > 0)

  const endRes2 = await fetch(`${baseUrl}/api/interview/${interviewId}/end`, {
    method: 'POST',
    headers: jsonHeaders(token),
  })
  assert.equal(endRes2.status, 200)

  const detailRes2 = await fetch(`${baseUrl}/api/interview/${interviewId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const detailJson2 = await detailRes2.json() as any
  assert.equal(detailJson2?.data?.status, 'completed')
  assert.equal(detailJson2?.data?.endTime, firstEndTime)
})

test('RAG 命中测试：索引后应能召回相关 chunk', async () => {
  const { indexChunksForRecord, buildRetrievalContext } = await import('../services/rag.js')

  const recordId = `rec-${Date.now()}`
  indexChunksForRecord(recordId, [
    'Vue3 + Pinia 适合中大型前端状态管理场景。',
    'React Query 更适合服务端状态同步。',
  ], {
    knowledgeBaseId: 'kb-test',
    knowledgeBaseName: '测试知识库',
    documentId: 'doc-1',
    documentTitle: '前端技术选型',
  })

  const hits = await buildRetrievalContext('Pinia 状态管理', 3, { knowledgeBaseId: 'kb-test' })
  assert.ok(hits.length > 0)
  assert.equal(hits[0]?.metadata?.knowledgeBaseId, 'kb-test')
  assert.ok(hits.some((h) => h.text.includes('Pinia')))
})
