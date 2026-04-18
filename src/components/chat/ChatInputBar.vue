<template>
  <div class="chat-input-bar">
    <div class="input-toolbar">
      <el-button-group>
        <el-button :type="inputMode === 'text' ? 'primary' : 'default'" @click="$emit('update:inputMode', 'text')">
          <el-icon><ChatLineSquare /></el-icon>
          {{ textModeLabel }}
        </el-button>
        <el-button :type="inputMode === 'voice' ? 'primary' : 'default'" @click="$emit('update:inputMode', 'voice')">
          <el-icon><Microphone /></el-icon>
          {{ voiceModeLabel }}
        </el-button>
      </el-button-group>
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
        <el-button type="primary" :disabled="!textValue.trim() || loading" @click="sendText">
          <el-icon><Promotion /></el-icon>
          {{ sendLabel }}
        </el-button>
      </div>
    </div>

    <div v-else class="voice-input">
      <div class="voice-indicator" :class="{ recording: recording }" @mousedown="onStartRecord" @mouseup="onStopRecord" @touchstart.prevent="onStartRecord" @touchend.prevent="onStopRecord">
        <el-icon :size="32" :color="recording ? '#fff' : '#409eff'">
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
import { ChatLineSquare, Microphone, Promotion } from '@element-plus/icons-vue'

const textValue = defineModel<string>('textValue', { default: '' })

defineProps<{
  inputMode: 'text' | 'voice'
  loading: boolean
  recording: boolean
  placeholder: string
  hintText: string
  sendLabel: string
  textModeLabel: string
  voiceModeLabel: string
  recordingHint: string
  holdHint: string
}>()

const emit = defineEmits<{
  'update:inputMode': ['text' | 'voice']
  sendText: []
  startRecord: []
  stopRecord: []
}>()

const sendText = () => emit('sendText')
const onStartRecord = () => emit('startRecord')
const onStopRecord = () => emit('stopRecord')
</script>

<style scoped lang="scss">
.chat-input-bar { padding: 16px 24px; border-top: 1px solid #ebeef5; background: #fff; }
.input-toolbar { margin-bottom: 12px; }
.text-input :deep(.el-textarea__inner) { border-radius: 8px; }
.input-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; }
.input-hint, .voice-hint { font-size: 12px; color: #909399; }
.voice-input { display: flex; flex-direction: column; align-items: center; padding: 12px 0; }
.voice-indicator { width: 220px; height: 56px; border-radius: 28px; background: #eef2f7; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; border: 1px solid #d4dde8; gap: 10px; }
.voice-indicator.recording { background: #334155; border-color: transparent; }
.ring { position: absolute; border-radius: 28px; border: 1px solid rgba(255,255,255,.8); left: -2px; right: -2px; top: -2px; bottom: -2px; animation: ringPulse 1.5s infinite ease-out; }
.ring-2 { animation-delay: .45s; }
html[data-theme='dark'] .chat-input-bar { background: #171b20; border-top-color: #2c323a; }
html[data-theme='dark'] .voice-indicator { background: #202733; border-color: #364153; }
@keyframes ringPulse { 0% { transform: scale(1); opacity: .8; } 100% { transform: scale(1.1); opacity: 0; } }
</style>
