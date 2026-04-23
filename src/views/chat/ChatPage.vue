<template>
  <div class="chat-page">
    <ConversationList
      :items="visibleConversationItems"
      :total-count="conversationItems.length"
      :active-id="activeConversationId"
      :title="sidebarTitle"
      :create-label="createLabel"
      :search-placeholder="searchPlaceholder"
      @select="selectConversation"
      @create="createConversation"
      @load-more="loadMoreConversations"
    />

    <section class="chat-main">
      <header class="chat-header">
        <div>
          <h2>{{ pageTitle }}</h2>
          <p>{{ pageSubtitle }}</p>
        </div>
        <div class="agent-toolbar">
          <div class="agent-picker">
            <span>Agent</span>
            <el-select :model-value="activeAgentId" placeholder="选择 Agent" size="small" style="width: 220px" @update:model-value="setActiveAgent">
              <el-option v-for="agent in agentOptions" :key="agent.id" :label="agent.name" :value="agent.id" />
            </el-select>
          </div>
          <div class="agent-picker">
            <span>RAG</span>
            <el-select :model-value="ragStrategy" placeholder="检索策略" size="small" style="width: 170px" @update:model-value="setRagStrategy($event)">
              <el-option v-for="option in ragStrategyOptions" :key="option.id" :label="option.label" :value="option.id" />
            </el-select>
          </div>
          <div v-if="activeAgent" class="agent-panel">
            <div class="agent-panel__head">
              <strong>{{ activeAgent.name }}</strong>
              <span>Temp {{ activeAgent.temperature.toFixed(2) }} · Max {{ activeAgent.maxTokens }}</span>
            </div>
            <p class="agent-panel__desc">{{ activeAgent.description || '暂无描述' }}</p>
            <div class="agent-panel__tags">
              <span class="tag" :class="{ on: activeAgent.memoryEnabled }">Memory {{ activeAgent.memoryEnabled ? 'ON' : 'OFF' }}</span>
              <span class="tag" :class="{ on: activeAgent.ragEnabled }">RAG {{ activeAgent.ragEnabled ? 'ON' : 'OFF' }}</span>
              <span class="tag" :class="{ on: activeAgent.toolEnabled }">Tool {{ activeAgent.toolEnabled ? 'ON' : 'OFF' }}</span>
              <span class="tag">KB {{ activeAgent.defaultKnowledgeBaseId || '-' }}</span>
            </div>
          </div>
        </div>
      </header>

      <div class="chat-content-wrap">
        <ChatMessageList
          :messages="activeMessages"
          :has-more="hasMoreMessages"
          :streaming-message-id="activeStreamingMessageId"
          :empty-text="emptyText"
          :assistant-label="assistantLabel"
          :user-label="userLabel"
          :voice-label="voiceLabel"
          :assistant-avatar="assistantAvatar"
          :user-avatar="userAvatar"
          @load-more="loadMoreMessages"
        />

        <aside class="tool-log-panel">
          <div class="tool-log-panel__head">
            <strong>工具调用日志</strong>
            <span>{{ toolCallLogs.length }} 条</span>
          </div>
          <div class="tool-log-list">
            <ToolCallTimeline :items="toolCallLogs" empty-text="暂无工具调用" />
          </div>
        </aside>
      </div>

      <ChatInputBar
        v-model:text-value="inputText"
        :input-mode="inputMode"
        :loading="isActiveConversationGenerating"
        :recording="isRecording"
        :placeholder="inputPlaceholder"
        :hint-text="hintText"
        :send-label="sendLabel"
        :text-mode-label="textModeLabel"
        :voice-mode-label="voiceModeLabel"
        :recording-hint="recordingHint"
        :hold-hint="holdHint"
        @update:inputMode="inputMode = $event"
        @sendText="handleSendMessage"
        @startRecord="startRecording"
        @stopRecord="stopRecording"
        @stopReply="stopAssistantReply"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import ConversationList from '@/components/chat/ConversationList.vue'
import ChatInputBar from '@/components/chat/ChatInputBar.vue'
import ChatMessageList from '@/components/chat/ChatMessageList.vue'
import ToolCallTimeline from '@/components/chat/ToolCallTimeline.vue'
import { useChatPage } from './useChatPage'

const {
  assistantAvatar,
  userAvatar,
  inputText,
  inputMode,
  isRecording,
  conversationItems,
  activeConversationId,
  activeMessages,
  visibleConversationItems,
  hasMoreMessages,
  activeStreamingMessageId,
  isActiveConversationGenerating,
  pageTitle,
  pageSubtitle,
  sidebarTitle,
  createLabel,
  searchPlaceholder,
  emptyText,
  assistantLabel,
  userLabel,
  voiceLabel,
  inputPlaceholder,
  hintText,
  sendLabel,
  textModeLabel,
  voiceModeLabel,
  recordingHint,
  holdHint,
  agentOptions,
  activeAgentId,
  activeAgent,
  ragStrategy,
  setRagStrategy,
  ragStrategyOptions,
  toolCallLogs,
  setActiveAgent,
  selectConversation,
  createConversation,
  loadMoreConversations,
  loadMoreMessages,
  handleSendMessage,
  startRecording,
  stopRecording,
  stopAssistantReply,
} = useChatPage()
</script>

<style scoped lang="scss">
.chat-page {
  --bg-color: #faf9f6;
  --white: #ffffff;
  --text-main: #262626;
  --text-muted: #8e8e8e;
  --border-color: #efefef;
  --ai-bubble: #ffffff;
  --user-bubble: #89a99b;
  --input-bg: #fafafa;
  --page-shadow: 0 20px 50px rgba(0, 0, 0, 0.1);
  --feed-divider: rgba(0, 0, 0, 0.04);

  height: calc(100vh - 120px);
  display: flex;
  background: #f0f0f0;
  border-radius: 30px;
  overflow: hidden;
  box-shadow: var(--page-shadow);
  position: relative;
}

.chat-page::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255,255,255,0.12), transparent 32%, rgba(0,0,0,0.02));
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg-color);
  position: relative;
  z-index: 1;
}

.chat-content-wrap {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 12px;
  padding: 10px 12px 0;
}

.tool-log-panel {
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.75);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.tool-log-panel__head {
  display: flex;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  font-size: 12px;
  color: var(--text-muted);
}

.tool-log-list {
  padding: 10px;
  overflow-y: auto;
  min-height: 0;
}

.chat-header {
  min-height: 60px;
  background: rgba(255, 255, 255, 0.9);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
}

.chat-header h2 {
  margin: 0 0 3px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
}

.chat-header p {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted);
}

.agent-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent-picker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}

.agent-panel {
  min-width: 300px;
  max-width: 420px;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.78);
}

.agent-panel__head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.agent-panel__head strong {
  color: var(--text-main);
  font-size: 13px;
}

.agent-panel__desc {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-panel__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}

.tag.on {
  color: #4f7666;
  border-color: rgba(137, 169, 155, 0.45);
  background: rgba(137, 169, 155, 0.15);
}
html[data-theme='dark'] .chat-page {
  --bg-color: #111418;
  --white: #1a1f24;
  --text-main: #eceff3;
  --text-muted: #98a0aa;
  --border-color: #252a31;
  --ai-bubble: #1a1f24;
  --user-bubble: #6f877d;
  --input-bg: #14181d;
  --page-shadow: 0 22px 54px rgba(0, 0, 0, 0.38);
  --feed-divider: rgba(255, 255, 255, 0.05);
  background: #0c0f12;
}

html[data-theme='dark'] .chat-header {
  background: rgba(26, 31, 36, 0.9);
  border-bottom-color: var(--border-color);
}

@media (max-width: 1024px) {
  .chat-page {
    height: auto;
    min-height: calc(100vh - 120px);
    flex-direction: column;
    border-radius: 22px;
  }
}
</style>
