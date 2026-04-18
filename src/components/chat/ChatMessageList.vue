<template>
  <div ref="listRef" class="chat-message-list">
    <div v-if="messages.length === 0" class="empty-state">
      <el-empty :description="emptyText">
        <template #image>
          <el-icon :size="72" color="#409eff"><ChatDotRound /></el-icon>
        </template>
      </el-empty>
    </div>

    <div
      v-for="message in messages"
      :key="message.id"
      class="message-item"
      :class="message.role"
    >
      <div class="message-avatar">
        <el-avatar
          :size="36"
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

        <div class="message-bubble" :class="{ thinking: isThinking(message.id), streaming: isStreaming(message.id) }">
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

        <div v-if="message.role === 'assistant' && citationsFor(message).length" class="citation-panel">
          <div class="citation-header">
            <span>引用依据</span>
            <span>{{ citationsFor(message).length }} 条</span>
          </div>

          <div class="citation-list">
            <article v-for="cite in citationsFor(message)" :key="cite.id" class="citation-card">
              <div class="citation-topline">
                <span class="citation-source">{{ cite.sourceLabel }}</span>
                <span class="citation-score">{{ formatScore(cite.score) }}</span>
              </div>
              <div class="citation-title">{{ cite.title }}</div>
              <div class="citation-summary">{{ cite.summary }}</div>
              <div class="citation-footer">
                <span class="citation-chip">chunk #{{ cite.chunkIndex }}</span>
                <span class="citation-chip" v-if="cite.weight !== undefined">weight {{ cite.weight }}</span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { ChatDotRound, DocumentCopy, Microphone } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { ChatMessage, ChatMessageMetadata } from '@/types/chat'

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const renderContent = (text: string) => {
  const escaped = escapeHtml(text)
  const blocks = escaped
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_match: string, lang: string, code: string) => {
      return `<pre class="code-block"><div class="code-block-header"><span>${lang || 'code'}</span></div><code>${code.replace(/\n$/, '')}</code></pre>`
    })
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/^[-*] (.*)$/gm, '<li>$1</li>')

  const paragraphs = blocks
    .split(/\n{2,}/)
    .map((segment: string) => segment.trim())
    .filter(Boolean)
    .map((segment: string) => {
      if (/^<h[1-3]>|^<ul>|^<ol>|^<pre|^<li>/.test(segment)) return segment
      return `<p>${segment.replace(/\n/g, '<br />')}</p>`
    })
    .join('')

  return paragraphs
    .replace(/(<li>.*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/<ul>(\s*<ul>)/g, '$1')
    .replace(/(<\/li>)(\s*<ul>)/g, '$1')
}

const props = defineProps<{
  messages: ChatMessage[]
  streamingMessageId?: string | null
  emptyText: string
  assistantLabel: string
  userLabel: string
  voiceLabel: string
  assistantAvatar?: string
  userAvatar?: string
}>()

const listRef = ref<HTMLElement | null>(null)
const isStreaming = (id: string) => props.streamingMessageId === id
const isThinking = (id: string) => props.streamingMessageId === id
const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

type CitationItem = {
  id: string
  title: string
  summary: string
  sourceLabel: string
  score: number
  chunkIndex: number
  weight?: number
}

const normalizeCitation = (raw: Record<string, unknown>, index: number): CitationItem => ({
  id: String(raw.id || index),
  title: String(raw.documentTitle || raw.title || raw.sourceName || raw.sourceId || '引用来源'),
  summary: String(raw.content || raw.summary || raw.text || ''),
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

const copyMessage = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制')
  } catch {
    ElMessage.error('复制失败')
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (!listRef.value) return
    listRef.value.scrollTop = listRef.value.scrollHeight
  })
}

watch(() => props.messages, scrollToBottom, { deep: true, immediate: true })
</script>

<style scoped lang="scss">
.chat-message-list {
  flex: 1;
  overflow-y: auto;
  padding: 22px 24px 28px;
  background: #f7f7f8;
}
.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.message-item {
  display: flex;
  gap: 14px;
  margin-bottom: 20px;
}
.message-item.user {
  flex-direction: row-reverse;
}
.message-item.user .message-content {
  align-items: flex-end;
}
.message-item.user .message-bubble {
  background: #4b8bf5;
  color: #fff;
  border-radius: 18px 18px 6px 18px;
  padding: 12px 14px 14px;
}
.message-item.assistant .message-bubble {
  background: #fff;
  border-radius: 18px 18px 18px 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 12px 28px rgba(15, 23, 42, 0.06);
}
.message-content {
  display: flex;
  flex-direction: column;
  max-width: min(780px, 72%);
}
.message-meta {
  display: flex;
  gap: 10px;
  margin: 0 0 8px;
  font-size: 13px;
  align-items: center;
}
.message-name {
  color: #6b7280;
  font-weight: 600;
}
.message-time {
  color: #9ca3af;
}
.message-bubble {
  position: relative;
  padding: 14px 16px 42px;
  line-height: 1.75;
  min-height: 22px;
}
.message-bubble.streaming {
  padding-right: 18px;
}
.message-bubble p {
  margin: 0;
  white-space: pre-wrap;
}
.markdown-body {
  font-size: 14px;
  color: inherit;
}
.markdown-body :deep(p) {
  margin: 0 0 14px;
  line-height: 1.8;
}
.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 16px 0 10px;
  line-height: 1.3;
  font-weight: 700;
}
.markdown-body :deep(ul) {
  margin: 12px 0;
  padding-left: 20px;
}
.markdown-body :deep(li) {
  margin: 6px 0;
  line-height: 1.7;
}
.markdown-body :deep(.inline-code) {
  padding: 0.1rem 0.35rem;
  border-radius: 6px;
  background: rgba(148, 163, 184, 0.16);
  font-size: 0.92em;
}
.markdown-body :deep(pre.code-block) {
  margin: 14px 0;
  padding: 0;
  background: #0b1020;
  color: #dbe7ff;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.14);
}
.markdown-body :deep(.code-block-header) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  font-size: 12px;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}
.markdown-body :deep(pre.code-block code) {
  display: block;
  padding: 14px;
  overflow: auto;
  white-space: pre;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.7;
}
.audio-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  opacity: 0.85;
}
.typing-indicator,
.thinking-state {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 18px;
}
.thinking-title {
  font-size: 13px;
  color: #6b7280;
}
.thinking-dots {
  display: inline-flex;
  gap: 4px;
}
.thinking-dots i,
.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #b0b7c3;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}
.thinking-dots i:nth-child(2),
.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}
.thinking-dots i:nth-child(3),
.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}
.copy-btn {
  position: absolute;
  right: 10px;
  bottom: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  color: #475569;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.copy-btn:hover {
  transform: translateY(-1px);
  background: #fff;
  border-color: rgba(59, 130, 246, 0.3);
  color: #2563eb;
}

.citation-panel {
  margin-top: 12px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.84);
  padding: 12px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}
.citation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 12px;
  color: #64748b;
}
.citation-list {
  display: grid;
  gap: 10px;
}
.citation-card {
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 14px;
  padding: 10px 12px;
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.94));
}
.citation-topline {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
  font-size: 12px;
  color: #64748b;
}
.citation-title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
}
.citation-summary {
  font-size: 12px;
  line-height: 1.6;
  color: #475569;
}
.citation-footer {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.citation-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.08);
  color: #2563eb;
  font-size: 11px;
}

html[data-theme='dark'] .chat-message-list {
  background: #161a1f;
}
html[data-theme='dark'] .message-item.assistant .message-bubble {
  background: #252b33;
  color: #e7ecf3;
}
html[data-theme='dark'] .message-item.user .message-bubble {
  background: #3f67f0;
}
html[data-theme='dark'] .copy-btn {
  background: rgba(31, 41, 55, 0.88);
  color: #dbe7ff;
  border-color: rgba(148, 163, 184, 0.18);
}
html[data-theme='dark'] .copy-btn:hover {
  background: #273041;
  color: #fff;
}
html[data-theme='dark'] .citation-panel {
  background: rgba(17, 24, 39, 0.9);
  border-color: rgba(148, 163, 184, 0.14);
}
html[data-theme='dark'] .citation-card {
  background: rgba(15, 23, 42, 0.82);
  border-color: rgba(148, 163, 184, 0.12);
}
html[data-theme='dark'] .citation-title {
  color: #e5eefb;
}
html[data-theme='dark'] .citation-summary {
  color: #cbd5e1;
}
html[data-theme='dark'] .citation-chip {
  background: rgba(59, 130, 246, 0.16);
  color: #93c5fd;
}
@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-8px);
    opacity: 1;
  }
}
</style>
