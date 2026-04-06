<template>
  <div class="interview-container">
    <div class="interview-header">
      <div class="header-info">
        <h2>AI 模拟面试</h2>
        <div class="interview-meta" v-if="interviewStore.currentInterview">
          <el-tag type="success" size="small">
            <el-icon><Timer /></el-icon>
            {{ formatDuration(interviewDuration) }}
          </el-tag>
          <el-tag :type="difficultyType" size="small">
            {{ difficultyLabel }}
          </el-tag>
          <el-tag type="info" size="small">
            {{ messageCount }} 条消息
          </el-tag>
        </div>
      </div>
      <div class="header-actions">
        <el-button 
          v-if="!interviewStore.isInterviewing"
          type="primary" 
          size="large"
          @click="showConfigDialog = true"
        >
          <el-icon><VideoPlay /></el-icon>
          开始面试
        </el-button>
        <el-button 
          v-else
          type="danger" 
          size="large"
          @click="handleEndInterview"
        >
          <el-icon><VideoPause /></el-icon>
          结束面试
        </el-button>
      </div>
    </div>

    <!-- 面试配置对话框 -->
    <el-dialog
      v-model="showConfigDialog"
      title="面试配置"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="interviewConfig" label-width="100px">
        <el-form-item label="应聘岗位">
          <el-select 
            v-model="interviewConfig.position" 
            placeholder="请选择面试岗位"
            style="width: 100%"
          >
            <el-option label="前端开发工程师" value="frontend" />
            <el-option label="后端开发工程师" value="backend" />
            <el-option label="全栈工程师" value="fullstack" />
            <el-option label="移动端开发工程师" value="mobile" />
            <el-option label="算法工程师" value="algorithm" />
            <el-option label="测试工程师" value="qa" />
          </el-select>
        </el-form-item>
        <el-form-item label="难度级别">
          <el-radio-group v-model="interviewConfig.difficulty">
            <el-radio label="easy">简单</el-radio>
            <el-radio label="medium">中等</el-radio>
            <el-radio label="hard">困难</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="面试时长">
          <el-select 
            v-model="interviewConfig.duration" 
            placeholder="请选择面试时长"
            style="width: 100%"
          >
            <el-option label="15 分钟" :value="15" />
            <el-option label="30 分钟" :value="30" />
            <el-option label="45 分钟" :value="45" />
            <el-option label="60 分钟" :value="60" />
          </el-select>
        </el-form-item>
        <el-form-item label="面试类型">
          <el-radio-group v-model="interviewConfig.type">
            <el-radio label="technical">技术面试</el-radio>
            <el-radio label="behavioral">行为面试</el-radio>
            <el-radio label="mixed">综合面试</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showConfigDialog = false">取消</el-button>
        <el-button type="primary" @click="handleStartInterview">开始面试</el-button>
      </template>
    </el-dialog>

    <!-- 面试对话区域 -->
    <div class="interview-content">
      <!-- 消息列表 -->
      <div class="message-list" ref="messageListRef">
        <!-- 开始提示 -->
        <div v-if="!interviewStore.isInterviewing" class="empty-state">
          <el-empty description="点击上方按钮开始 AI 模拟面试">
            <template #image>
              <el-icon :size="80" color="#409eff"><ChatDotRound /></el-icon>
            </template>
          </el-empty>
        </div>

        <!-- 面试消息 -->
        <div 
          v-for="message in messages" 
          :key="message.id"
          class="message-item"
          :class="message.role"
        >
          <div class="message-avatar">
            <el-avatar 
              :size="40" 
              :icon="message.role === 'assistant' ? 'Avatar' : 'User'"
              :class="message.role"
            />
          </div>
          <div class="message-content">
            <div class="message-header">
              <span class="message-name">
                {{ message.role === 'assistant' ? 'AI 面试官' : '我' }}
              </span>
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
            </div>
            <div class="message-body">
              <p v-if="!message.isAudio">{{ message.content }}</p>
              <div v-else class="audio-message">
                <el-icon><Microphone /></el-icon>
                <span>语音消息</span>
                <audio 
                  v-if="message.audioUrl" 
                  :src="message.audioUrl" 
                  controls
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 加载指示器 -->
        <div v-if="isLoading" class="message-item assistant loading">
          <div class="message-avatar">
            <el-avatar :size="40" class="assistant">
              <el-icon><Avatar /></el-icon>
            </el-avatar>
          </div>
          <div class="message-content">
            <div class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="input-area" v-if="interviewStore.isInterviewing">
        <div class="input-toolbar">
          <el-button-group>
            <el-button 
              :type="inputMode === 'text' ? 'primary' : 'default'"
              @click="inputMode = 'text'"
            >
              <el-icon><ChatLineSquare /></el-icon>
              文本输入
            </el-button>
            <el-button 
              :type="inputMode === 'voice' ? 'primary' : 'default'"
              @click="toggleVoiceInput"
            >
              <el-icon><Microphone /></el-icon>
              语音输入
            </el-button>
          </el-button-group>
        </div>

        <!-- 文本输入 -->
        <div v-if="inputMode === 'text'" class="text-input">
          <el-input
            v-model="inputText"
            type="textarea"
            :rows="3"
            placeholder="请输入你的回答，按 Enter 发送，Shift+Enter 换行"
            resize="none"
            @keydown.enter.exact.prevent="handleSendMessage"
          />
          <div class="input-actions">
            <span class="input-hint">按 Enter 发送消息</span>
            <el-button 
              type="primary" 
              :disabled="!inputText.trim() || isLoading"
              @click="handleSendMessage"
            >
              <el-icon><Promotion /></el-icon>
              发送
            </el-button>
          </div>
        </div>

        <!-- 语音输入 -->
        <div v-else class="voice-input">
          <div class="voice-status">
            <div 
              class="voice-indicator"
              :class="{ recording: isRecording }"
              @mousedown="startRecording"
              @mouseup="stopRecording"
              @mouseleave="stopRecording"
            >
              <el-icon :size="32" :color="isRecording ? '#fff' : '#409eff'">
                <Microphone />
              </el-icon>
            </div>
            <p class="voice-hint">
              {{ isRecording ? '正在录音... 点击松开发送' : '按住说话' }}
            </p>
          </div>

          <!-- 音频波形可视化 -->
          <div v-if="isRecording" class="waveform-container">
            <canvas ref="waveformCanvas" class="waveform-canvas"></canvas>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useInterviewStore } from '@/store'
import { wsService } from '@/service/websocket'
import { audioService } from '@/service/audio'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const interviewStore = useInterviewStore()

// 状态变量
const showConfigDialog = ref(false)
const inputMode = ref<'text' | 'voice'>('text')
const inputText = ref('')
const isLoading = ref(false)
const isRecording = ref(false)
const messageListRef = ref<HTMLElement>()
const waveformCanvas = ref<HTMLCanvasElement>()

// 面试配置
const interviewConfig = ref({
  position: 'frontend',
  difficulty: 'medium' as 'easy' | 'medium' | 'hard',
  duration: 30,
  type: 'mixed' as 'technical' | 'behavioral' | 'mixed'
})

// 计算属性
const messages = computed(() => interviewStore.currentInterview?.messages || [])

const messageCount = computed(() => messages.value.length)

const interviewDuration = computed(() => {
  if (!interviewStore.currentInterview) return 0
  return Date.now() - interviewStore.currentInterview.startTime
})

const difficultyLabel = computed(() => {
  const labels = { easy: '简单', medium: '中等', hard: '困难' }
  return labels[interviewConfig.value.difficulty]
})

const difficultyType = computed(() => {
  const types = { easy: 'success', medium: 'warning', hard: 'danger' }
  return types[interviewConfig.value.difficulty]
})

// 定时器
let durationTimer: number | null = null
let animationFrameId: number | null = null

// 格式化时间
const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 格式化时长
const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

// 开始面试
const handleStartInterview = () => {
  const positionLabels: Record<string, string> = {
    frontend: '前端开发工程师',
    backend: '后端开发工程师',
    fullstack: '全栈工程师',
    mobile: '移动端开发工程师',
    algorithm: '算法工程师',
    qa: '测试工程师'
  }

  const title = `${positionLabels[interviewConfig.value.position]} - ${difficultyLabel.value}难度`
  interviewStore.startNewInterview(title)

  showConfigDialog.value = false

  // 启动时长计时器
  durationTimer = window.setInterval(() => {
    // 更新面试时长
  }, 1000)

  // 连接 WebSocket
  wsService.connect().catch(err => {
    console.error('WebSocket 连接失败:', err)
    ElMessage.warning('实时连接失败，部分功能可能不可用')
  })

  // 监听 WebSocket 事件
  setupWebSocketListeners()

  ElMessage.success('面试已开始，祝你好运！')
}

// 设置 WebSocket 监听器
const setupWebSocketListeners = () => {
  wsService.on('new_message', (data) => {
    if (data.role === 'assistant') {
      interviewStore.addMessage({
        id: `msg_${Date.now()}`,
        content: data.message.content,
        role: 'assistant',
        timestamp: Date.now()
      })
      scrollToBottom()
    }
  })

  wsService.on('analysis_ready', (data) => {
    ElMessage.success('面试分析已完成')
    router.push(`/dashboard/report/${data.interviewId}`)
  })
}

// 发送消息
const handleSendMessage = async () => {
  const content = inputText.value.trim()
  if (!content || isLoading.value) return

  // 添加用户消息
  const userMessage = {
    id: `msg_${Date.now()}`,
    content,
    role: 'user' as const,
    timestamp: Date.now()
  }
  interviewStore.addMessage(userMessage)
  inputText.value = ''
  scrollToBottom()

  // 发送消息到服务器
  isLoading.value = true
  try {
    if (interviewStore.currentInterview) {
      wsService.sendUserMessage(
        interviewStore.currentInterview.id,
        content
      )
    }
  } catch (error) {
    ElMessage.error('发送消息失败')
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

// 切换语音输入
const toggleVoiceInput = () => {
  inputMode.value = 'voice'
}

// 开始录音
const startRecording = async () => {
  if (!audioService.isRecordingSupported()) {
    ElMessage.error('您的浏览器不支持语音录制')
    return
  }

  try {
    isRecording.value = true
    await audioService.startRecording()
    startWaveformAnimation()
  } catch (error) {
    ElMessage.error('无法访问麦克风，请检查权限设置')
    isRecording.value = false
  }
}

// 停止录音
const stopRecording = async () => {
  if (!isRecording.value) return

  try {
    isRecording.value = false
    cancelAnimationFrame(animationFrameId!)
    
    const audioBlob = await audioService.startRecording()
    
    // 添加语音消息
    const audioUrl = URL.createObjectURL(audioBlob)
    interviewStore.addMessage({
      id: `msg_${Date.now()}`,
      content: '语音消息',
      role: 'user',
      timestamp: Date.now(),
      isAudio: true,
      audioUrl
    })
    scrollToBottom()

    // 发送语音数据
    isLoading.value = true
    const base64Audio = await audioService.audioToBase64(audioBlob)
    
    if (interviewStore.currentInterview) {
      wsService.sendUserMessage(
        interviewStore.currentInterview.id,
        '',
        base64Audio
      )
    }
  } catch (error) {
    console.error('录音失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 波形动画
const startWaveformAnimation = () => {
  const canvas = waveformCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = canvas.offsetWidth
  canvas.height = 60

  const draw = () => {
    const data = audioService.getWaveformData()
    if (!data) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineWidth = 2
    ctx.strokeStyle = '#409eff'
    ctx.beginPath()

    const sliceWidth = canvas.width / data.length
    let x = 0

    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128.0
      const y = (v * canvas.height) / 2

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }

      x += sliceWidth
    }

    ctx.lineTo(canvas.width, canvas.height / 2)
    ctx.stroke()

    animationFrameId = requestAnimationFrame(draw)
  }

  draw()
}

// 结束面试
const handleEndInterview = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要结束当前面试吗？结束后将生成面试分析报告。',
      '结束面试',
      {
        confirmButtonText: '确定结束',
        cancelButtonText: '继续面试',
        type: 'warning'
      }
    )

    if (interviewStore.currentInterview) {
      wsService.endInterview(interviewStore.currentInterview.id)
    }

    // 清除定时器
    if (durationTimer) {
      clearInterval(durationTimer)
      durationTimer = null
    }

    // 断开 WebSocket
    wsService.disconnect()

    ElMessage.success('面试已结束，正在生成分析报告...')
    
    // 跳转到报告页面
    setTimeout(() => {
      router.push(`/dashboard/report/${interviewStore.currentInterview?.id}`)
    }, 1000)
  } catch {
    // 用户取消
  }
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// 监听消息变化
watch(messages, () => {
  scrollToBottom()
})

// 生命周期
onMounted(() => {
  scrollToBottom()
})

onUnmounted(() => {
  if (durationTimer) {
    clearInterval(durationTimer)
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  wsService.disconnect()
})
</script>

<style lang="scss" scoped>
.interview-container {
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;

  .interview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #ebeef5;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;

    .header-info {
      h2 {
        margin: 0 0 8px 0;
        font-size: 20px;
      }

      .interview-meta {
        display: flex;
        gap: 12px;

        :deep(.el-tag) {
          .el-icon {
            margin-right: 4px;
          }
        }
      }
    }
  }

  .interview-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .message-list {
      flex: 1;
      overflow-y: auto;
      padding: 20px 24px;
      background: #f8f9fb;

      .empty-state {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .message-item {
        display: flex;
        gap: 16px;
        margin-bottom: 20px;

        &.user {
          flex-direction: row-reverse;

          .message-content {
            align-items: flex-end;

            .message-body {
              background: #409eff;
              color: white;
              border-radius: 16px 16px 4px 16px;
            }
          }
        }

        &.assistant {
          .message-content {
            .message-body {
              background: white;
              border-radius: 16px 16px 16px 4px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            }
          }
        }

        &.loading {
          .message-content {
            padding: 16px 20px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }
        }

        .message-content {
          display: flex;
          flex-direction: column;
          max-width: 70%;

          .message-header {
            display: flex;
            gap: 12px;
            margin-bottom: 8px;
            font-size: 13px;

            .message-name {
              color: #606266;
              font-weight: 500;
            }

            .message-time {
              color: #909399;
            }
          }

          .message-body {
            padding: 12px 16px;
            line-height: 1.6;

            p {
              margin: 0;
              white-space: pre-wrap;
            }

            .audio-message {
              display: flex;
              align-items: center;
              gap: 8px;

              audio {
                height: 32px;
                margin-left: 8px;
              }
            }
          }
        }
      }

      .typing-indicator {
        display: flex;
        gap: 4px;

        span {
          width: 8px;
          height: 8px;
          background: #909399;
          border-radius: 50%;
          animation: typing 1.4s infinite;

          &:nth-child(2) {
            animation-delay: 0.2s;
          }

          &:nth-child(3) {
            animation-delay: 0.4s;
          }
        }
      }
    }

    .input-area {
      padding: 16px 24px;
      border-top: 1px solid #ebeef5;
      background: white;

      .input-toolbar {
        margin-bottom: 12px;
      }

      .text-input {
        :deep(.el-textarea__inner) {
          border-radius: 8px;
        }

        .input-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;

          .input-hint {
            font-size: 12px;
            color: #909399;
          }
        }
      }

      .voice-input {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;

        .voice-status {
          display: flex;
          flex-direction: column;
          align-items: center;

          .voice-indicator {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: #ecf5ff;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s;
            border: 3px solid #409eff;

            &.recording {
              background: #f56c6c;
              border-color: #f56c6c;
              animation: pulse 1s infinite;
            }

            &:hover {
              transform: scale(1.05);
            }
          }

          .voice-hint {
            margin-top: 12px;
            font-size: 14px;
            color: #606266;
          }
        }

        .waveform-container {
          width: 100%;
          margin-top: 20px;

          .waveform-canvas {
            width: 100%;
            height: 60px;
            background: #f8f9fb;
            border-radius: 8px;
          }
        }
      }
    }
  }
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.4);
  }
  50% {
    box-shadow: 0 0 0 20px rgba(245, 108, 108, 0);
  }
}
</style>
