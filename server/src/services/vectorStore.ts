import fs from 'fs'
import path from 'path'

export interface VectorRecord<T = Record<string, unknown>> {
  id: string
  text: string
  vector: number[]
  metadata?: T
}

export interface VectorHit<T = Record<string, unknown>> extends VectorRecord<T> {
  score: number
}

const DIM = Number(process.env.VECTOR_DIM || 16)
const INDEX_PATH = process.env.VECTOR_INDEX_PATH || path.resolve(process.cwd(), 'data', 'vector-index.json')
const HNSW_PATH = process.env.VECTOR_HNSW_PATH || path.resolve(process.cwd(), 'data', 'vector-hnsw.bin')
const USE_HNSW = process.env.VECTOR_ENGINE === 'hnswlib-node'

const ensureDir = () => {
  const dir = path.dirname(INDEX_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const normalize = (vector: number[]) => {
  const length = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1
  return vector.map((value) => value / length)
}

const dot = (a: number[], b: number[]) => a.reduce((sum, value, index) => sum + value * (b[index] || 0), 0)

let records: VectorRecord[] = []
let hnsw: any = null
let hnswReady = false

const loadRecords = () => {
  try {
    ensureDir()
    if (!fs.existsSync(INDEX_PATH)) return
    const raw = fs.readFileSync(INDEX_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    records = Array.isArray(parsed) ? parsed : []
  } catch {
    records = []
  }
}

const saveRecords = () => {
  try {
    ensureDir()
    fs.writeFileSync(INDEX_PATH, JSON.stringify(records, null, 2), 'utf-8')
  } catch {
    // ignore persistence failure
  }
}

const loadHnsw = async () => {
  if (!USE_HNSW) return null
  if (hnswReady) return hnsw
  try {
    const mod = await import('hnswlib-node') as any
    const HierarchicalNSW = mod?.HierarchicalNSW || mod?.default?.HierarchicalNSW
    if (!HierarchicalNSW) return null
    hnsw = new HierarchicalNSW('cosine', DIM)
    if (fs.existsSync(HNSW_PATH)) {
      hnsw.readIndexSync(HNSW_PATH)
    } else {
      hnsw.initIndex(records.length || 1)
    }
    hnswReady = true
    return hnsw
  } catch {
    return null
  }
}

const rebuildHnsw = async () => {
  const index = await loadHnsw()
  if (!index) return null
  const size = Math.max(records.length + 1, 1)
  index.initIndex(size)
  records.forEach((record, idx) => index.addPoint(normalize(record.vector), idx))
  try {
    index.writeIndexSync(HNSW_PATH)
  } catch {
    // ignore
  }
  return index
}

loadRecords()

export const vectorStore = {
  async upsert(record: VectorRecord) {
    const index = records.findIndex((item) => item.id === record.id)
    const next = { ...record, vector: normalize(record.vector) }
    if (index >= 0) records[index] = next
    else records.push(next)
    saveRecords()
    if (USE_HNSW) await rebuildHnsw()
    return next
  },

  async remove(id: string) {
    const index = records.findIndex((item) => item.id === id)
    if (index >= 0) {
      records.splice(index, 1)
      saveRecords()
      if (USE_HNSW) await rebuildHnsw()
    }
  },

  async search(queryVector: number[], limit = 5): Promise<VectorHit[]> {
    const q = normalize(queryVector)
    if (USE_HNSW) {
      const index = await loadHnsw()
      if (index) {
        try {
          const result = index.searchKnn(q, limit)
          const ids = Array.isArray(result?.neighbors) ? result.neighbors : []
          const distances = Array.isArray(result?.distances) ? result.distances : []
          return ids.map((id: number, idx: number) => {
            const record = records[id]
            const score = 1 - Number(distances[idx] || 0)
            return { ...record, score }
          }).filter(Boolean)
        } catch {
          // fallback below
        }
      }
    }

    return [...records]
      .map((item) => ({ ...item, score: dot(q, item.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  },

  async all() {
    return [...records]
  },

  embed(text: string) {
    const seed = text.slice(0, 512)
    return Array.from({ length: DIM }, (_, i) => {
      const code = seed.charCodeAt(i % Math.max(1, seed.length)) || 0
      return Number((((code + i * 17) % 101) / 100).toFixed(4))
    })
  },

  persist: saveRecords,
  load: loadRecords,
  indexPath: INDEX_PATH,
  hnswPath: HNSW_PATH,
  tryLoadHnsw: loadHnsw,
}
