import { defineStore } from 'pinia'

export type KnowledgeBaseStatus = 'active' | 'archived' | 'deleted'
export type DocumentStatus = 'pending' | 'uploading' | 'parsing' | 'indexing' | 'ready' | 'failed' | 'archived'
export type ChunkStatus = 'pending' | 'indexed' | 'failed'
export type IndexStatus = 'idle' | 'indexing' | 'ready' | 'failed'
export type FileType = 'pdf' | 'docx' | 'txt' | 'md'

export interface KnowledgeBase {
  id: string
  userId?: number | string
  name: string
  description?: string
  status: KnowledgeBaseStatus
  createdAt: number
  updatedAt: number
  lastIndexedAt?: number
  documentCount: number
  chunkCount: number
  indexStatus: IndexStatus
  indexVersion: number
  tags?: string[]
}

export interface KnowledgeDocument {
  id: string
  knowledgeBaseId: string
  title: string
  filename: string
  fileType?: FileType
  mimeType?: string
  size?: number
  status: DocumentStatus
  sourceUrl?: string
  originalUrl?: string
  createdAt: number
  updatedAt: number
  parsedAt?: number
  indexedAt?: number
  chunkCount: number
  checksum?: string
  extractedText?: string
  cleanedText?: string
  parseError?: string
  metadata?: Record<string, unknown>
}

export interface KnowledgeChunk {
  id: string
  knowledgeBaseId: string
  documentId: string
  chunkIndex: number
  content: string
  tokenCount?: number
  status: ChunkStatus
  createdAt: number
  updatedAt: number
  embeddingStatus: IndexStatus
  embeddingId?: string
  vector?: number[]
  metadata?: Record<string, unknown>
}

const KB_KEY = 'ai-interview-knowledge-bases'
const DOC_KEY = 'ai-interview-knowledge-documents'
const CHUNK_KEY = 'ai-interview-knowledge-chunks'

const now = () => Date.now()
const uid = (prefix: string) => `${prefix}_${now()}_${Math.random().toString(36).slice(2, 8)}`

const read = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

const write = (key: string, value: unknown[]) => localStorage.setItem(key, JSON.stringify(value))
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const detectFileType = (filename: string, mimeType = ''): FileType | undefined => {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'pdf' || mimeType.includes('pdf')) return 'pdf'
  if (ext === 'docx' || mimeType.includes('wordprocessingml')) return 'docx'
  if (ext === 'txt' || mimeType.includes('text/plain')) return 'txt'
  if (ext === 'md' || ext === 'markdown') return 'md'
  return undefined
}

const cleanText = (text: string) =>
  text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^[ \t]+/gm, '')
    .replace(/\u0000/g, '')
    .trim()

const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4))

const splitParagraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean)

const splitBySentences = (text: string) =>
  text
    .replace(/([。！？!?；;])/g, '$1\n')
    .split(/\n+/)
    .map((segment) => segment.trim())
    .filter(Boolean)

const chunkText = (text: string, targetSize = 900, overlap = 120) => {
  const paragraphs = splitParagraphs(text)
  const chunks: string[] = []
  let buffer = ''

  const pushBuffer = () => {
    const trimmed = buffer.trim()
    if (trimmed) chunks.push(trimmed)
    buffer = ''
  }

  for (const para of paragraphs.length ? paragraphs : splitBySentences(text)) {
    if ((buffer + '\n\n' + para).length <= targetSize) {
      buffer = buffer ? `${buffer}\n\n${para}` : para
      continue
    }

    pushBuffer()
    if (para.length <= targetSize) {
      buffer = para
      continue
    }

    const sentences = splitBySentences(para)
    for (const sentence of sentences) {
      if ((buffer + sentence).length <= targetSize) {
        buffer = buffer ? `${buffer}${sentence}` : sentence
      } else {
        pushBuffer()
        buffer = sentence
      }
    }
  }

  pushBuffer()

  return chunks.map((chunk, index) => {
    if (index === 0 || overlap <= 0) return chunk
    const prev = chunks[index - 1]
    const tail = prev.slice(Math.max(0, prev.length - overlap))
    return `${tail}\n${chunk}`.trim()
  })
}

const simulateEmbedding = (text: string) => {
  const seed = text.slice(0, 512)
  const vector = Array.from({ length: 16 }, (_, i) => {
    const code = seed.charCodeAt(i % Math.max(1, seed.length)) || 0
    return Number((((code + i * 17) % 101) / 100).toFixed(4))
  })
  return vector
}

export const useKnowledgeBaseStore = defineStore('knowledgeBase', {
  state: () => ({
    knowledgeBases: read<KnowledgeBase>(KB_KEY),
    documents: read<KnowledgeDocument>(DOC_KEY),
    chunks: read<KnowledgeChunk>(CHUNK_KEY),
  }),

  actions: {
    persist() {
      write(KB_KEY, this.knowledgeBases)
      write(DOC_KEY, this.documents)
      write(CHUNK_KEY, this.chunks)
    },

    createKnowledgeBase(payload: { name: string; description?: string; userId?: number | string; tags?: string[] }) {
      const timestamp = now()
      const kb: KnowledgeBase = {
        id: uid('kb'),
        name: payload.name,
        description: payload.description,
        userId: payload.userId,
        status: 'active',
        createdAt: timestamp,
        updatedAt: timestamp,
        documentCount: 0,
        chunkCount: 0,
        indexStatus: 'idle',
        indexVersion: 1,
        tags: payload.tags ?? [],
      }
      this.knowledgeBases.unshift(kb)
      this.persist()
      return kb
    },

    updateKnowledgeBase(id: string, patch: Partial<Omit<KnowledgeBase, 'id' | 'createdAt'>>) {
      const kb = this.knowledgeBases.find((item) => item.id === id)
      if (!kb) return undefined
      Object.assign(kb, patch, { updatedAt: now() })
      this.persist()
      return kb
    },

    deleteKnowledgeBase(id: string) {
      const kb = this.knowledgeBases.find((item) => item.id === id)
      if (!kb) return false
      kb.status = 'deleted'
      kb.updatedAt = now()
      this.documents.forEach((doc) => {
        if (doc.knowledgeBaseId === id) doc.status = 'archived'
      })
      this.chunks.forEach((chunk) => {
        if (chunk.knowledgeBaseId === id) chunk.status = 'failed'
      })
      this.persist()
      return true
    },

    addDocument(payload: { knowledgeBaseId: string; title: string; filename: string; fileType?: FileType; mimeType?: string; size?: number; sourceUrl?: string; originalUrl?: string; metadata?: Record<string, unknown> }) {
      const timestamp = now()
      const doc: KnowledgeDocument = {
        id: uid('doc'),
        knowledgeBaseId: payload.knowledgeBaseId,
        title: payload.title,
        filename: payload.filename,
        fileType: payload.fileType ?? detectFileType(payload.filename, payload.mimeType),
        mimeType: payload.mimeType,
        size: payload.size,
        status: 'pending',
        sourceUrl: payload.sourceUrl,
        originalUrl: payload.originalUrl,
        createdAt: timestamp,
        updatedAt: timestamp,
        chunkCount: 0,
        metadata: payload.metadata,
      }
      this.documents.unshift(doc)
      this.syncCounters(payload.knowledgeBaseId)
      this.persist()
      return doc
    },

    updateDocument(id: string, patch: Partial<Omit<KnowledgeDocument, 'id' | 'createdAt' | 'knowledgeBaseId'>>) {
      const doc = this.documents.find((item) => item.id === id)
      if (!doc) return undefined
      Object.assign(doc, patch, { updatedAt: now() })
      this.persist()
      return doc
    },

    deleteDocument(id: string) {
      const doc = this.documents.find((item) => item.id === id)
      if (!doc) return false
      doc.status = 'archived'
      doc.updatedAt = now()
      this.chunks = this.chunks.map((chunk) =>
        chunk.documentId === id ? { ...chunk, status: 'failed', embeddingStatus: 'failed', updatedAt: now() } : chunk,
      )
      this.syncCounters(doc.knowledgeBaseId)
      this.persist()
      return true
    },

    addChunk(payload: { knowledgeBaseId: string; documentId: string; chunkIndex: number; content: string; tokenCount?: number; metadata?: Record<string, unknown> }) {
      const timestamp = now()
      const chunk: KnowledgeChunk = {
        id: uid('chunk'),
        knowledgeBaseId: payload.knowledgeBaseId,
        documentId: payload.documentId,
        chunkIndex: payload.chunkIndex,
        content: payload.content,
        tokenCount: payload.tokenCount,
        status: 'pending',
        createdAt: timestamp,
        updatedAt: timestamp,
        embeddingStatus: 'idle',
        metadata: payload.metadata,
      }
      this.chunks.push(chunk)
      this.syncCounters(payload.knowledgeBaseId)
      this.persist()
      return chunk
    },

    updateChunk(id: string, patch: Partial<Omit<KnowledgeChunk, 'id' | 'createdAt' | 'knowledgeBaseId' | 'documentId'>>) {
      const chunk = this.chunks.find((item) => item.id === id)
      if (!chunk) return undefined
      Object.assign(chunk, patch, { updatedAt: now() })
      this.persist()
      return chunk
    },

    syncCounters(knowledgeBaseId: string) {
      const kb = this.knowledgeBases.find((item) => item.id === knowledgeBaseId)
      if (!kb) return
      kb.documentCount = this.documents.filter((doc) => doc.knowledgeBaseId === knowledgeBaseId && doc.status !== 'archived').length
      kb.chunkCount = this.chunks.filter((chunk) => chunk.knowledgeBaseId === knowledgeBaseId && chunk.status !== 'failed').length
      kb.updatedAt = now()
    },

    setIndexStatus(knowledgeBaseId: string, status: IndexStatus) {
      const kb = this.knowledgeBases.find((item) => item.id === knowledgeBaseId)
      if (!kb) return undefined
      kb.indexStatus = status
      kb.updatedAt = now()
      if (status === 'ready') kb.lastIndexedAt = now()
      this.persist()
      return kb
    },

    batchIndexDocument(documentId: string) {
      const doc = this.documents.find((item) => item.id === documentId)
      if (!doc) return undefined
      doc.status = 'indexing'
      doc.updatedAt = now()
      const chunks = this.chunks.filter((item) => item.documentId === documentId)
      chunks.forEach((chunk) => {
        chunk.embeddingStatus = 'indexing'
        chunk.status = 'pending'
        chunk.updatedAt = now()
      })
      this.setIndexStatus(doc.knowledgeBaseId, 'indexing')
      this.persist()
      return doc
    },

    markDocumentReady(documentId: string) {
      const doc = this.documents.find((item) => item.id === documentId)
      if (!doc) return undefined
      doc.status = 'ready'
      doc.parsedAt = doc.parsedAt ?? now()
      doc.indexedAt = now()
      doc.updatedAt = now()
      this.chunks.forEach((chunk) => {
        if (chunk.documentId === documentId) {
          chunk.status = 'indexed'
          chunk.embeddingStatus = 'ready'
          chunk.vector = chunk.vector || simulateEmbedding(chunk.content)
          chunk.embeddingId = chunk.embeddingId || uid('vec')
          chunk.updatedAt = now()
        }
      })
      this.syncCounters(doc.knowledgeBaseId)
      this.setIndexStatus(doc.knowledgeBaseId, 'ready')
      this.persist()
      return doc
    },

    markDocumentFailed(documentId: string, error?: string) {
      const doc = this.documents.find((item) => item.id === documentId)
      if (!doc) return undefined
      doc.status = 'failed'
      doc.parseError = error
      doc.updatedAt = now()
      this.chunks.forEach((chunk) => {
        if (chunk.documentId === documentId) {
          chunk.status = 'failed'
          chunk.embeddingStatus = 'failed'
          chunk.updatedAt = now()
        }
      })
      this.setIndexStatus(doc.knowledgeBaseId, 'failed')
      this.persist()
      return doc
    },

    async parseDocumentFile(file: File) {
      const fileType = detectFileType(file.name, file.type)
      if (!fileType) throw new Error(`不支持的文件类型: ${file.name}`)

      if (fileType === 'pdf') {
        const buffer = await file.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let text = ''
        for (let i = 0; i < bytes.length; i += 1) {
          const code = bytes[i]
          if (code >= 32 || code === 10 || code === 13 || code === 9) text += String.fromCharCode(code)
        }
        return cleanText(text.replace(/\\/g, ' '))
      }

      return cleanText(await file.text())
    },

    async uploadAndParseDocument(payload: {
      knowledgeBaseId: string
      file: File
      title?: string
      sourceUrl?: string
      metadata?: Record<string, unknown>
    }) {
      const timestamp = now()
      const doc = this.addDocument({
        knowledgeBaseId: payload.knowledgeBaseId,
        title: payload.title || payload.file.name,
        filename: payload.file.name,
        mimeType: payload.file.type,
        size: payload.file.size,
        sourceUrl: payload.sourceUrl,
        originalUrl: payload.sourceUrl,
        metadata: payload.metadata,
      })
      doc.status = 'uploading'
      doc.updatedAt = timestamp
      this.persist()

      try {
        doc.status = 'parsing'
        doc.updatedAt = now()
        this.persist()

        const extractedText = await this.parseDocumentFile(payload.file)
        const cleanedText = cleanText(extractedText)
        doc.extractedText = extractedText
        doc.cleanedText = cleanedText
        doc.parsedAt = now()
        doc.status = 'indexing'
        doc.updatedAt = now()
        this.persist()

        const chunks = this.chunkDocument(doc.id, cleanedText)
        await this.embedDocument(doc.id)
        doc.chunkCount = chunks.length
        this.markDocumentReady(doc.id)
        return doc
      } catch (error) {
        const message = error instanceof Error ? error.message : '解析失败'
        this.markDocumentFailed(doc.id, message)
        throw error instanceof Error ? error : new Error(message)
      }
    },

    chunkDocument(documentId: string, text?: string) {
      const doc = this.documents.find((item) => item.id === documentId)
      if (!doc) return [] as KnowledgeChunk[]
      const content = text ?? doc.cleanedText ?? doc.extractedText ?? ''
      const parts = chunkText(content)
      const existing = this.chunks.filter((item) => item.documentId === documentId)
      existing.forEach((chunk) => {
        const index = this.chunks.findIndex((item) => item.id === chunk.id)
        if (index >= 0) this.chunks.splice(index, 1)
      })
      const created = parts.map((part, index) => this.addChunk({
        knowledgeBaseId: doc.knowledgeBaseId,
        documentId: doc.id,
        chunkIndex: index,
        content: part,
        tokenCount: estimateTokens(part),
        metadata: { fileType: doc.fileType, title: doc.title },
      }))
      doc.chunkCount = created.length
      doc.updatedAt = now()
      this.syncCounters(doc.knowledgeBaseId)
      this.persist()
      return created
    },

    async embedDocument(documentId: string) {
      const doc = this.documents.find((item) => item.id === documentId)
      if (!doc) return [] as KnowledgeChunk[]
      this.batchIndexDocument(documentId)
      await delay(10)
      const chunks = this.chunks.filter((item) => item.documentId === documentId)
      chunks.forEach((chunk) => {
        chunk.vector = simulateEmbedding(chunk.content)
        chunk.embeddingId = chunk.embeddingId || uid('vec')
        chunk.embeddingStatus = 'ready'
        chunk.status = 'indexed'
        chunk.updatedAt = now()
      })
      doc.status = 'ready'
      doc.indexedAt = now()
      doc.updatedAt = now()
      this.setIndexStatus(doc.knowledgeBaseId, 'ready')
      this.persist()
      return chunks
    },

    rebuildIndex(documentId: string) {
      const doc = this.documents.find((item) => item.id === documentId)
      if (!doc) return undefined
      this.batchIndexDocument(documentId)
      this.chunkDocument(documentId, doc.cleanedText || doc.extractedText || '')
      return this.embedDocument(documentId)
    },
  },
})
