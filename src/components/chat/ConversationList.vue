<template>
  <aside class="conversation-list">
    <div class="list-header">
      <h3>{{ title }}</h3>
      <el-button type="primary" size="small" @click="$emit('create')">{{ createLabel }}</el-button>
    </div>

    <el-input v-model="keyword" :placeholder="searchPlaceholder" clearable>
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>

    <div class="items">
      <button
        v-for="item in filteredItems"
        :key="item.id"
        class="item"
        :class="{ active: item.id === activeId }"
        @click="$emit('select', item.id)"
      >
        <div class="item-title">{{ item.title }}</div>
        <div class="item-subtitle">{{ formatTime(item.updatedAt) }}</div>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

export interface ConversationItem {
  id: string
  title: string
  updatedAt: number
}

const props = defineProps<{
  items: ConversationItem[]
  activeId: string | null
  title: string
  createLabel: string
  searchPlaceholder: string
}>()

const emit = defineEmits<{ select: [string]; create: [] }>()
const keyword = ref('')

const filteredItems = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return props.items
  return props.items.filter(i => i.title.toLowerCase().includes(q))
})

const formatTime = (ts: number) => new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
</script>

<style scoped lang="scss">
.conversation-list { width: 280px; display: flex; flex-direction: column; gap: 12px; padding: 16px; border-right: 1px solid #ebeef5; background: #fff; }
.list-header { display: flex; align-items: center; justify-content: space-between; }
.list-header h3 { margin: 0; font-size: 16px; }
.items { display: flex; flex-direction: column; gap: 8px; overflow: auto; }
.item { text-align: left; border: 1px solid #ebeef5; border-radius: 10px; padding: 10px 12px; background: #fafbfc; cursor: pointer; }
.item.active { border-color: #409eff; background: #ecf5ff; }
.item-title { font-weight: 600; color: #303133; }
.item-subtitle { margin-top: 4px; font-size: 12px; color: #909399; }
html[data-theme='dark'] .conversation-list { background: #171b20; border-right-color: #2c323a; }
html[data-theme='dark'] .item { background: #1f252d; border-color: #2c323a; }
html[data-theme='dark'] .item-title { color: #e7ecf3; }
</style>
