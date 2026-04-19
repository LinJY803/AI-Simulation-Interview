<template>
  <div class="chat-input-bar">
    <div class="input-toolbar">
      <button class="mode-btn" :class="{ active: inputMode === 'text' }" @click="$emit('update:inputMode', 'text')">
        <el-icon><ChatLineSquare /></el-icon>
        {{ textModeLabel }}
      </button>
      <button class="mode-btn" :class="{ active: inputMode === 'voice' }" @click="$emit('update:inputMode', 'voice')">
        <el-icon><Microphone /></el-icon>
        {{ voiceModeLabel }}
      </button>
      <button v-if="loading" class="mode-btn ghost" type="button" @click="$emit('stopReply')">
        <el-icon><Close /></el-icon>
        打断回复
      </button>
    </div>

    <div v-if="inputMode === 'text'" class="text-input">
      <el-input
        v-model="textValue"
        type="textarea"
        :rows="3"
        :placeholder="placeholder"
        resize="none"
        @keydown.enter.exact.prevent="sendText"
      />
      <div class="input-actions">
        <span class="input-hint">{{ hintText }}</span>
        <button class="send-btn" type="button" :disabled="!textValue.trim() || loading" @click="sendText">
          <el-icon><Promotion /></el-icon>
          {{ sendLabel }}
        </button>
      </div>
    </div>

    <div v-else class="voice-input">
      <div class="voice-indicator" :class="{ recording: recording }" @mousedown="onStartRecord" @mouseup="onStopRecord" @touchstart.prevent="onStartRecord" @touchend.prevent="onStopRecord">
        <el-icon :size="32" :color="recording ? '#fff' : '#89a99b'">
          <Microphone />
        </el-icon>
        <span v-if="recording" class="ring ring-1"></span>
        <span v-if="recording" class="ring ring-2"></span>
      </div>
      <p class="voice-hint">{{ recording ? recordingHint : holdHint }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChatLineSquare, Close, Microphone, Promotion } from '@element-plus/icons-vue'
const textValue = defineModel<string>('textValue', { default: '' })
defineProps<{ inputMode: 'text' | 'voice'; loading: boolean; recording: boolean; placeholder: string; hintText: string; sendLabel: string; textModeLabel: string; voiceModeLabel: string; recordingHint: string; holdHint: string }>()
const emit = defineEmits<{ 'update:inputMode': ['text' | 'voice']; sendText: []; startRecord: []; stopRecord: []; stopReply: [] }>()
const sendText = () => emit('sendText')
const onStartRecord = () => emit('startRecord')
const onStopRecord = () => emit('stopRecord')
</script>

<style scoped lang="scss">
.chat-input-bar {
  padding: 14px 18px 18px;
  border-top: 1px solid var(--border-color);
  background: rgba(255,255,255,.92);
  backdrop-filter: blur(16px);
}
.input-toolbar { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.mode-btn {
  height: 36px; padding: 0 14px; border-radius: 999px; border: 1px solid #ece5dc; background: #fff; color: #8e8e8e; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; transition: all .2s ease;
}
.mode-btn:hover { transform: translateY(-1px); }
.mode-btn.active { background: #89a99b; color: #fff; border-color: transparent; }
.mode-btn.ghost { background: rgba(255,255,255,.72); }
.text-input :deep(.el-textarea__inner) { border-radius: 18px; background: var(--input-bg); border-color: #e8ded3; box-shadow: none; }
.input-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; gap: 10px; }
.input-hint, .voice-hint { font-size: 12px; color: var(--text-muted); }
.send-btn { border-radius: 999px; background: #89a99b; border: none; color: #fff; height: 38px; padding: 0 14px; display: inline-flex; align-items: center; gap: 6px; }
.send-btn:disabled { opacity: .55; cursor: not-allowed; }
.voice-input { display: flex; flex-direction: column; align-items: center; padding: 10px 0 2px; }
.voice-indicator { width: 100%; max-width: 320px; height: 56px; border-radius: 28px; background: var(--input-bg); display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; border: 1px solid #e8ded3; gap: 10px; transition: all .2s ease; }
.voice-indicator.recording { background: var(--user-bubble); border-color: transparent; }
.ring { position: absolute; border-radius: 28px; border: 1px solid rgba(255,255,255,.8); left: -2px; right: -2px; top: -2px; bottom: -2px; animation: ringPulse 1.5s infinite ease-out; }
@keyframes ringPulse { 0% { transform: scale(1); opacity: .8; } 100% { transform: scale(1.08); opacity: 0; } }
</style>
