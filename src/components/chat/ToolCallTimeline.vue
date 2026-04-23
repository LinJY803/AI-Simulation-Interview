<template>
  <div class="tool-timeline">
    <div v-if="title" class="tool-timeline__header">
      <span>{{ title }}</span>
      <span>{{ items.length }} 条</span>
    </div>

    <div v-if="!items.length" class="tool-timeline__empty">{{ emptyText }}</div>

    <div v-else class="tool-timeline__list">
      <article v-for="tool in items" :key="tool.id" class="tool-card">
        <button class="tool-card__head" type="button" @click="toggleToolExpand(tool.id)">
          <span class="tool-card__name">{{ tool.toolName }}</span>
          <span class="tool-card__status" :class="tool.status">{{ toolStatusLabel(tool.status) }}</span>
        </button>
        <div class="tool-card__meta">{{ tool.durationMs ? `耗时 ${tool.durationMs}ms` : '调用中...' }}</div>
        <div v-if="isToolExpanded(tool.id)" class="tool-card__body">
          <div class="tool-card__section">
            <div class="tool-card__section-title">输入</div>
            <pre class="tool-card__code">{{ JSON.stringify(tool.input || {}, null, 2) }}</pre>
          </div>
          <div class="tool-card__section">
            <div class="tool-card__section-title">输出</div>
            <pre class="tool-card__code">{{ JSON.stringify(tool.output ?? tool.error ?? null, null, 2) }}</pre>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { ToolCallRecord } from '@/views/chat/toolProtocol'

const props = withDefaults(defineProps<{
  items: ToolCallRecord[]
  title?: string
  emptyText?: string
}>(), {
  title: '',
  emptyText: '暂无工具调用',
})

const toolExpandedMap = ref<Record<string, boolean>>({})
const isToolExpanded = (toolId: string) => toolExpandedMap.value[toolId] !== false
const toggleToolExpand = (toolId: string) => {
  toolExpandedMap.value = {
    ...toolExpandedMap.value,
    [toolId]: !isToolExpanded(toolId),
  }
}

const toolStatusLabel = (status: ToolCallRecord['status']) => {
  if (status === 'running') return '调用中'
  if (status === 'success') return '成功'
  return '失败'
}
</script>

<style scoped lang="scss">
.tool-timeline { display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.tool-timeline__header { display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; }
.tool-timeline__empty { font-size: 12px; color: #8e8e8e; }
.tool-timeline__list { display: grid; gap: 10px; overflow-y: auto; }
.tool-card { border: 1px solid rgba(148,163,184,.15); border-radius: 12px; background: rgba(248,250,252,.75); padding: 10px; }
.tool-card__head { width: 100%; border: none; background: transparent; display: flex; justify-content: space-between; align-items: center; cursor: pointer; padding: 0; }
.tool-card__name { font-size: 13px; font-weight: 600; color: #1f2937; }
.tool-card__status { font-size: 11px; padding: 2px 8px; border-radius: 999px; border: 1px solid rgba(148,163,184,.35); color: #6b7280; }
.tool-card__status.running { color: #8a6d1d; border-color: rgba(180,150,64,.45); background: rgba(250,236,180,.35); }
.tool-card__status.success { color: #2f6b53; border-color: rgba(48,151,96,.35); background: rgba(149,230,179,.2); }
.tool-card__status.error { color: #a63b3b; border-color: rgba(220,53,69,.35); background: rgba(255,205,210,.28); }
.tool-card__meta { margin-top: 6px; font-size: 11px; color: #8e8e8e; }
.tool-card__body { margin-top: 8px; display: grid; gap: 8px; }
.tool-card__section-title { font-size: 11px; color: #8e8e8e; margin-bottom: 4px; }
.tool-card__code { margin: 0; padding: 8px; border-radius: 8px; background: rgba(15,23,42,.05); font-size: 11px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; }

html[data-theme='dark'] .tool-card, html[data-theme='dark'] .tool-timeline { border-color: #2c323a; }
html[data-theme='dark'] .tool-card { background: #1b2027; }
html[data-theme='dark'] .tool-card__name { color: #e7ecf3; }
html[data-theme='dark'] .tool-timeline__header,
html[data-theme='dark'] .tool-timeline__empty,
html[data-theme='dark'] .tool-card__meta,
html[data-theme='dark'] .tool-card__section-title { color: #98a0aa; }
html[data-theme='dark'] .tool-card__code { background: rgba(148,163,184,.12); }
</style>
