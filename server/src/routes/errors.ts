import { Router, type Request, type Response } from 'express'
import fs from 'fs'
import path from 'path'

const router = Router()

router.post('/', (req: Request, res: Response) => {
  const dataDir = process.env.DATA_DIR || './data'
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  const filePath = path.resolve(dataDir, 'errors.log')

  const payload = req.body || {}
  const entry = {
    id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: Date.now(),
    ...payload,
  }

  fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, 'utf-8')

  res.json({ code: 200, success: true, message: '已接收', data: { received: true } })
})

export default router
