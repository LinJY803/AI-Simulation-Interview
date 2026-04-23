<template>
  <div ref="listRef" class="chat-message-list">
    <div v-if="hasMore" class="load-more-wrap">
      <button class="load-more-btn" type="button" @click="$emit('load-more')">加载更早消息</button>
    </div>
    <div v-if="messages.length === 0" class="empty-state">
      <el-empty :description="emptyText">
        <template #image>
          <el-icon :size="72" color="#89a99b"><ChatDotRound /></el-icon>
        </template>
      </el-empty>
    </div>

    <div v-if="virtualTopPadding > 0" :style="{ height: `${virtualTopPadding}px` }" />

    <div
      v-for="message in visibleMessages"
      :key="message.id"
      :ref="(el) => setMessageRef(message.id, el as HTMLElement | null)"
      :data-mid="message.id"
      class="message-item"
      :class="message.role"
    >
      <div class="message-avatar">
        <el-avatar
          :size="34"
          :src="message.role === 'user' ? userAvatar : assistantAvatar"
          class="avatar-shadow"
        />
      </div>

      <div class="message-content">
        <div class="message-meta">
          <span class="message-name">
            {{ message.role === 'assistant' ? assistantLabel : userLabel }}
          </span>
          <span class="message-time">{{ formatTime(message.timestamp || message.createdAt) }}</span>
        </div>

        <div class="message-bubble" :class="{ streaming: isStreaming(message.id) }">
          <template v-if="message.isAudio">
            <p>{{ message.content }}</p>
            <div class="audio-badge">
              <el-icon><Microphone /></el-icon>
              <span>{{ voiceLabel }}</span>
            </div>
          </template>

          <template v-else>
            <div v-if="message.content" class="markdown-body" v-html="renderContent(message.content)" />
            <div v-else-if="isThinking(message.id)" class="thinking-state">
              <span class="thinking-title">正在生成</span>
              <span class="thinking-dots"><i></i><i></i><i></i></span>
            </div>
            <div v-else-if="isStreaming(message.id)" class="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </template>

          <button
            v-if="message.content && message.role === 'assistant'"
            class="copy-btn"
            type="button"
            @click="copyMessage(message.content)"
          >
            <el-icon><DocumentCopy /></el-icon>
            <span>复制</span>
          </button>
        </div>

        <div v-if="message.role === 'assistant' && toolCallsFor(message).length" class="tool-panel">
          <ToolCallTimeline :items="toolCallsFor(message)" title="工具过程" />
        </div>

        <div v-if="message.role === 'assistant' && citationsFor(message).length" class="citation-panel">
          <div class="citation-header">
            <span>引用依据</span>
            <span>{{ citationsFor(message).length }} 条命中</span>
          </div>

          <div class="citation-list">
            <article v-for="cite in citationsFor(message)" :key="cite.id" class="citation-card">
              <div class="citation-topline">
                <span class="citation-source">{{ cite.sourceLabel }}</span>
                <span class="citation-score">命中分 {{ formatScore(cite.score) }}</span>
              </div>
              <div class="citation-title">{{ cite.title }}</div>
              <div class="citation-summary">{{ cite.summary }}</div>
              <div class="citation-footer">
                <span class="citation-chip">chunk #{{ cite.chunkIndex }}</span>
                <span v-if="cite.weight !== undefined" class="citation-chip">weight {{ cite.weight.toFixed(2) }}</span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>

    <div v-if="virtualBottomPadding > 0" :style="{ height: `${virtualBottomPadding}px` }" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { ToolCallRecord } from '@/views/chat/toolProtocol'
import ToolCallTimeline from './ToolCallTimeline.vue'
import { ChatDotRound, DocumentCopy, Microphone } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { ChatMessage, ChatMessageMetadata } from '@/types/chat'

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const renderContent = (text: string) => {
  const escaped = escapeHtml(text)
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img class="markdown-image" loading="lazy" decoding="async" alt="$1" src="$2" />')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+\.(pdf|docx|txt|md))\)/gi, '<a class="markdown-doc-link" href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_match: string, lang: string, code: string) => `<pre class="code-block"><div class="code-block-header"><span>${lang || 'code'}</span></div><code>${code.replace(/\n$/, '')}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')

  const paragraphs = escaped
    .split(/\n{2,}/)
    .map(segment => segment.trim())
    .filter(Boolean)

  const rendered = paragraphs
    .map((segment) => {
      if (/^<h[1-3]>|^<pre|^<ul>|^<ol>/.test(segment)) return segment

      if (/^(?:<p>\s*)?(?:[-*+]\s.+)(?:<br \/>|\n|$)/.test(segment) || /(?:^|<br \/>)(?:[-*+]\s.+)/.test(segment)) {
        const items = segment
          .split(/<br \/>|\n/)
          .map(line => line.trim())
          .filter(line => /^[-*+]\s+/.test(line))
          .map(line => `<li>${line.replace(/^[-*+]\s+/, '')}</li>`)
          .join('')
        return items ? `<ul class="markdown-list">${items}</ul>` : ''
      }

      const block = segment
        .replace(/(?:^|<br \/>)([-*+]\s+)/g, '<br /><span class="bullet-marker">•</span> ')
        .replace(/^[-*+]\s+/, '<span class="bullet-marker">•</span> ')
      return `<p>${block}</p>`
    })
    .filter(Boolean)
    .join('')

  return rendered.replace(/<p>(<ul class="markdown-list">.*?<\/ul>)<\/p>/g, '$1')
}

const props = defineProps<{
  messages: ChatMessage[]
  hasMore?: boolean
  streamingMessageId?: string | null
  emptyText: string
  assistantLabel: string
  userLabel: string
  voiceLabel: string
  assistantAvatar?: string
  userAvatar?: string
}>()

defineEmits<{ 'load-more': [] }>()

const listRef = ref<HTMLElement | null>(null)

const DEFAULT_ITEM_HEIGHT = 176
const MIN_ITEM_HEIGHT = 56
const VIRTUAL_OVERSCAN_PX = 900
const scrollTop = ref(0)
const viewportHeight = ref(720)
const messageHeights = ref<Record<string, number>>({})
const messageRefs = new Map<string, HTMLElement>()
const resizeObserver = ref<ResizeObserver | null>(null)

const totalItems = computed(() => props.messages.length)
const heightsByIndex = computed(() => props.messages.map((m) => Math.max(MIN_ITEM_HEIGHT, messageHeights.value[m.id] || DEFAULT_ITEM_HEIGHT)))
const offsetsByIndex = computed(() => {
  const offsets = new Array<number>(heightsByIndex.value.length)
  let acc = 0
  for (let i = 0; i < heightsByIndex.value.length; i += 1) {
    offsets[i] = acc
    acc += heightsByIndex.value[i]
  }
  return offsets
})
const totalHeight = computed(() => heightsByIndex.value.reduce((sum, h) => sum + h, 0))

const lowerBound = (arr: number[], target: number) => {
  let l = 0
  let r = arr.length
  while (l < r) {
    const mid = (l + r) >> 1
    if (arr[mid] < target) l = mid + 1
    else r = mid
  }
  return l
}

const startIndex = computed(() => {
  const target = Math.max(0, scrollTop.value - VIRTUAL_OVERSCAN_PX)
  return Math.max(0, lowerBound(offsetsByIndex.value, target) - 1)
})

const endIndex = computed(() => {
  const target = scrollTop.value + viewportHeight.value + VIRTUAL_OVERSCAN_PX
  const idx = lowerBound(offsetsByIndex.value, target)
  return Math.min(totalItems.value, Math.max(idx + 1, startIndex.value + 1))
})

const visibleMessages = computed(() => props.messages.slice(startIndex.value, endIndex.value))
const virtualTopPadding = computed(() => offsetsByIndex.value[startIndex.value] || 0)
const virtualBottomPadding = computed(() => Math.max(0, totalHeight.value - virtualTopPadding.value - heightsByIndex.value.slice(startIndex.value, endIndex.value).reduce((sum, h) => sum + h, 0)))

const measureMessage = (id: string, el?: HTMLElement | null) => {
  const target = el || messageRefs.get(id)
  if (!target) return
  const h = Math.max(MIN_ITEM_HEIGHT, Math.ceil(target.getBoundingClientRect().height))
  if (messageHeights.value[id] === h) return
  messageHeights.value = { ...messageHeights.value, [id]: h }
}

const setMessageRef = (id: string, el: HTMLElement | null) => {
  if (!el) {
    const old = messageRefs.get(id)
    if (old && resizeObserver.value) resizeObserver.value.unobserve(old)
    messageRefs.delete(id)
    return
  }

  const prev = messageRefs.get(id)
  if (prev && prev !== el && resizeObserver.value) {
    resizeObserver.value.unobserve(prev)
  }

  messageRefs.set(id, el)
  if (resizeObserver.value) resizeObserver.value.observe(el)

  nextTick(() => {
    measureMessage(id, el)
    const imgs = Array.from(el.querySelectorAll('img'))
    imgs.forEach((img) => {
      if ((img as HTMLImageElement).complete) return
      img.addEventListener('load', () => measureMessage(id, el), { once: true })
      img.addEventListener('error', () => measureMessage(id, el), { once: true })
    })
  })
}

const handleScroll = () => {
  if (!listRef.value) return
  scrollTop.value = listRef.value.scrollTop
  viewportHeight.value = listRef.value.clientHeight
}

const isStreaming = (id: string) => props.streamingMessageId === id
const isThinking = (id: string) => props.streamingMessageId === id
const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

type CitationItem = { id: string; title: string; summary: string; sourceLabel: string; score: number; chunkIndex: number; weight?: number }
const toSummary = (value: unknown) => {
  const text = String(value || '').trim()
  if (!text) return '暂无 chunk 摘要'
  return text.length > 180 ? `${text.slice(0, 180)}...` : text
}
const normalizeCitation = (raw: Record<string, unknown>, index: number): CitationItem => ({
  id: String(raw.id || index),
  title: String(raw.documentTitle || raw.title || raw.sourceName || raw.sourceId || '引用来源'),
  summary: toSummary(raw.summary || raw.content || raw.text || raw.chunk),
  sourceLabel: String(raw.knowledgeBaseName || raw.sourceLabel || raw.sourceName || raw.sourceId || 'retrieval'),
  score: typeof raw.score === 'number' ? raw.score : typeof raw.relevance === 'number' ? raw.relevance : 0,
  chunkIndex: typeof raw.chunkIndex === 'number' ? raw.chunkIndex : typeof raw.index === 'number' ? raw.index : index,
  weight: typeof raw.weight === 'number' ? raw.weight : typeof raw.importance === 'number' ? raw.importance : undefined,
})
const citationsFor = (message: ChatMessage) => {
  const meta = message.metadata as ChatMessageMetadata | undefined
  const list = meta?.citations || meta?.retrieval?.citations || meta?.retrieval?.hits || meta?.retrieval || []
  const normalized = Array.isArray(list) ? list : list ? [list] : []
  return normalized.filter(Boolean).map((item, index) => normalizeCitation(item as Record<string, unknown>, index))
}
const formatScore = (score: number) => `${Math.max(0, Math.min(1, score)).toFixed(2)}`

const toolCallsFor = (message: ChatMessage): ToolCallRecord[] => {
  const list = (message.metadata?.toolCalls || []) as ToolCallRecord[]
  return list.filter(Boolean)
}

const copyMessage = async (text: string) => {
  try { await navigator.clipboard.writeText(text); ElMessage.success('已复制') } catch { ElMessage.error('复制失败') }
}
const scrollToBottom = () => {
  nextTick(() => {
    if (!listRef.value) return
    listRef.value.scrollTop = listRef.value.scrollHeight
    handleScroll()
  })
}

watch(() => props.messages, () => {
  scrollToBottom()
  nextTick(() => {
    visibleMessages.value.forEach((m) => measureMessage(m.id))
  })
}, { deep: true, immediate: true })

watch(visibleMessages, () => {
  nextTick(() => {
    visibleMessages.value.forEach((m) => measureMessage(m.id))
  })
})

onMounted(() => {
  handleScroll()
  listRef.value?.addEventListener('scroll', handleScroll, { passive: true })

  resizeObserver.value = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const node = entry.target as HTMLElement
      const id = node.dataset.mid
      if (!id) continue
      measureMessage(id, node)
    }
  })

  nextTick(() => {
    visibleMessages.value.forEach((m) => measureMessage(m.id))
    messageRefs.forEach((el) => resizeObserver.value?.observe(el))
  })
})

onUnmounted(() => {
  listRef.value?.removeEventListener('scroll', handleScroll)
  resizeObserver.value?.disconnect()
  resizeObserver.value = null
})
</script>

<style scoped lang="scss">
.chat-message-list {
  flex: 1;
  overflow-y: auto;
  padding: 22px 20px 26px;
  background: linear-gradient(180deg, #f8f4ee 0%, #f3ede4 100%);
}
.load-more-wrap { display: flex; justify-content: center; margin-bottom: 14px; }
.load-more-btn { border: 1px dashed #d2d7de; border-radius: 999px; background: rgba(255,255,255,.8); color: #6b7280; padding: 6px 14px; cursor: pointer; font-size: 12px; }
.empty-state { height: 100%; display: flex; align-items: center; justify-content: center; }
.message-item { display: flex; gap: 10px; margin-bottom: 18px; }
.message-item.user { flex-direction: row-reverse; }
.message-item.user .message-content { align-items: flex-end; }
.message-item.user .message-bubble { background: var(--user-bubble); color: #fff; border-radius: 18px 18px 4px 18px; box-shadow: 0 12px 24px rgba(137,169,155,.22); margin-bottom: 10px; }
.message-item.assistant .message-bubble { background: var(--ai-bubble); border: 1px solid var(--border-color); border-radius: 18px 18px 18px 4px; box-shadow: 0 2px 5px rgba(0,0,0,.02); }
.message-content { display: flex; flex-direction: column; max-width: min(720px, 80%); }
.message-meta { display: flex; gap: 10px; margin: 0 0 8px; font-size: 12px; align-items: center; }
.message-name { color: var(--text-main); font-weight: 600; }
.message-time { color: var(--text-muted); }
.message-bubble { position: relative; padding: 12px 16px 38px; line-height: 1.75; min-height: 22px; }
.markdown-body { font-size: 14px; color: inherit; }
.markdown-body :deep(p) { margin: 0 0 12px; line-height: 1.8; }
.markdown-body :deep(p:last-child) { margin-bottom: 0; }
.markdown-body :deep(.markdown-list) { margin: 4px 0 12px; padding-left: 1.35em; list-style-position: outside; }
.markdown-body :deep(.markdown-list li) { margin: 4px 0; line-height: 1.7; }
.markdown-body :deep(.markdown-list li::marker) { color: #89a99b; font-weight: 700; }
.markdown-body :deep(.bullet-marker) { display: inline-block; width: 1em; color: #89a99b; font-weight: 700; margin-right: 0.2em; vertical-align: baseline; }
.markdown-body :deep(.inline-code) { padding: .12rem .42rem; border-radius: 8px; background: rgba(148,163,184,.12); color: #334155; }
.markdown-body :deep(.markdown-image) { max-width: 100%; height: auto; border-radius: 10px; margin: 8px 0; display: block; }
.markdown-body :deep(.markdown-doc-link) { color: #3b82f6; text-decoration: underline; text-underline-offset: 2px; }
.markdown-body :deep(pre.code-block) { margin: 12px 0; background: linear-gradient(180deg, #121826, #0f172a); color: #e5eefb; border-radius: 16px; overflow: hidden; border: 1px solid rgba(148,163,184,.18); box-shadow: 0 16px 32px rgba(15,23,42,.14); }
.markdown-body :deep(.code-block-header) { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; font-size: 12px; color: #a3b0c2; background: rgba(255,255,255,.03); border-bottom: 1px solid rgba(148,163,184,.14); }
.markdown-body :deep(pre.code-block code) { display: block; padding: 14px 14px 16px; overflow: auto; white-space: pre; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12.5px; line-height: 1.75; }
.audio-badge, .typing-indicator, .thinking-state { display: inline-flex; align-items: center; gap: 8px; }
.copy-btn { position: absolute; right: 10px; bottom: 8px; display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid rgba(148,163,184,.18); border-radius: 999px; background: rgba(255,255,255,.82); color: #475569; font-size: 12px; cursor: pointer; }
.tool-panel { margin-top: 12px; border: 1px solid rgba(137,169,155,.22); border-radius: 18px; background: rgba(255,255,255,.9); padding: 12px; box-shadow: 0 12px 24px rgba(15,23,42,.06); }
.citation-panel { margin-top: 12px; border: 1px solid rgba(148,163,184,.14); border-radius: 18px; background: rgba(255,255,255,.88); padding: 12px; box-shadow: 0 14px 30px rgba(15,23,42,.06); }
.citation-header { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; color: #8e8e8e; }
.citation-list { display: grid; gap: 10px; }
.citation-card { border: 1px solid rgba(148,163,184,.12); border-radius: 16px; padding: 10px 12px; background: linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,250,252,.94)); }
.citation-topline { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 6px; font-size: 12px; color: #8e8e8e; }
.citation-title { font-size: 13px; font-weight: 600; color: #262626; margin-bottom: 4px; }
.citation-summary { font-size: 12px; line-height: 1.6; color: #6f6f6f; }
.citation-footer { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.citation-chip { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 999px; background: rgba(137,169,155,.12); color: #5d7269; font-size: 11px; }
html[data-theme='dark'] .chat-message-list { background: #161a1f; }
html[data-theme='dark'] .message-item.assistant .message-bubble { background: #252b33; color: #e7ecf3; }
html[data-theme='dark'] .copy-btn, html[data-theme='dark'] .citation-panel, html[data-theme='dark'] .citation-card, html[data-theme='dark'] .tool-panel { background: #1b2027; color: #e7ecf3; border-color: #2c323a; }
html[data-theme='dark'] .citation-title { color: #e7ecf3; }
html[data-theme='dark'] .citation-summary, html[data-theme='dark'] .citation-header, html[data-theme='dark'] .citation-topline { color: #98a0aa; }
</style>
