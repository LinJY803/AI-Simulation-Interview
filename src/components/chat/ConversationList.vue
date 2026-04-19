<template>
  <aside class="conversation-list">
    <div class="list-topbar">
      <div class="brand-stack">
        <p class="eyebrow">Direct</p>
        <h3>{{ title }}</h3>
      </div>
      <button class="create-btn" type="button" @click="$emit('create')">
        <el-icon><Plus /></el-icon>
        <span>{{ createLabel }}</span>
      </button>
    </div>

    <el-input v-model="keyword" :placeholder="searchPlaceholder" clearable class="search-input">
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
        <div class="item-avatar">{{ item.title.slice(0, 1) }}</div>
        <div class="item-meta">
          <div class="item-head">
            <div class="item-title">{{ item.title }}</div>
            <div class="item-time">{{ formatTime(item.updatedAt) }}</div>
          </div>
          <div class="item-preview">继续对话 · 点击查看消息</div>
        </div>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'

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

defineEmits<{ select: [string]; create: [] }>()
const keyword = ref('')

const filteredItems = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return props.items
  return props.items.filter(i => i.title.toLowerCase().includes(q))
})

const formatTime = (ts: number) => new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
</script>

<style scoped lang="scss">
.conversation-list {
  width: 300px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  background: linear-gradient(180deg, rgba(255,255,255,.84), rgba(250,247,242,.84));
  backdrop-filter: blur(18px);
}
.list-topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.brand-stack h3 {
  margin: 0;
  font-size: 22px;
  color: #262626;
  letter-spacing: -0.03em;
}
.eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  color: #8e8e8e;
  text-transform: uppercase;
  letter-spacing: 0.22em;
}
.create-btn {
  border-radius: 999px;
  background: #89a99b;
  color: #fff;
  border: none;
  height: 38px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 10px 18px rgba(137,169,155,.18);
}
.create-btn:hover { opacity: .95; transform: translateY(-1px); }
.items {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;
  padding-right: 2px;
}
.item {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  border: 1px solid #eee7df;
  border-radius: 22px;
  padding: 12px;
  background: rgba(255,255,255,.72);
  cursor: pointer;
  transition: all .18s ease;
}
.item:hover { transform: translateY(-1px); box-shadow: 0 12px 24px rgba(0,0,0,.04); }
.item.active {
  border-color: #89a99b;
  background: rgba(137, 169, 155, 0.12);
}
.item-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f4d8d2, #dfe9da);
  color: #262626;
  display: grid;
  place-items: center;
  font-weight: 700;
  flex: 0 0 auto;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.7);
}
.item-meta {
  min-width: 0;
  flex: 1;
}
.item-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}
.item-title {
  font-weight: 600;
  color: #262626;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-time {
  font-size: 11px;
  color: #8e8e8e;
  flex: 0 0 auto;
}
.item-preview {
  margin-top: 6px;
  font-size: 12px;
  color: #8e8e8e;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.search-input :deep(.el-input__wrapper) {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: none;
  border: 1px solid #ece5dc;
}
html[data-theme='dark'] .conversation-list {
  background: linear-gradient(180deg, rgba(22,26,31,.94), rgba(17,20,24,.94));
  border-right-color: rgba(255, 255, 255, 0.06);
}
html[data-theme='dark'] .brand-stack h3,
html[data-theme='dark'] .item-title {
  color: #e7ecf3;
}
html[data-theme='dark'] .item {
  background: #1f252d;
  border-color: #2c323a;
}
</style>
