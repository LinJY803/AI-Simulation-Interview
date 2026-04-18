<template>
  <div class="chat-page">
    <ConversationList
      :items="conversationItems"
      :active-id="activeConversationId"
      :title="sidebarTitle"
      :create-label="createLabel"
      :search-placeholder="searchPlaceholder"
      @select="selectConversation"
      @create="createConversation"
    />

    <section class="chat-main">
      <header class="chat-header">
        <div>
          <h2>{{ pageTitle }}</h2>
          <p>{{ pageSubtitle }}</p>
        </div>
      </header>

      <ChatMessageList
        :messages="activeMessages"
        :streaming-message-id="activeStreamingMessageId"
        :empty-text="emptyText"
        :assistant-label="assistantLabel"
        :user-label="userLabel"
        :voice-label="voiceLabel"
        :assistant-avatar="assistantAvatar"
        :user-avatar="userAvatar"
      />

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
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import ConversationList from '@/components/chat/ConversationList.vue'
import ChatInputBar from '@/components/chat/ChatInputBar.vue'
import ChatMessageList from '@/components/chat/ChatMessageList.vue'
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
  selectConversation,
  createConversation,
  handleSendMessage,
  startRecording,
  stopRecording,
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
  --page-shadow: 0 18px 44px rgba(0, 0, 0, 0.09);
  --feed-divider: rgba(0, 0, 0, 0.06);
  --surface-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
  --section-gap: 12px;
  --header-height: 56px;
  --footer-height: 82px;

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
  background: linear-gradient(90deg, transparent, var(--feed-divider), transparent);
  opacity: 0.7;
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

.chat-header {
  min-height: var(--header-height);
  background: rgba(255, 255, 255, 0.88);
  padding: 11px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-color);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.chat-header h2 {
  margin: 0 0 3px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

.chat-header p {
  margin: 0;
  font-size: 11px;
  color: var(--text-muted);
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
  --surface-shadow: 0 2px 5px rgba(0, 0, 0, 0.18);
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
