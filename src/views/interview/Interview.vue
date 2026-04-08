<template>
  <div class="interview-container">
    <!-- ==================== 顶部栏：面试状态 + 控制按钮 ==================== -->
    <div class="interview-header">
      <div class="header-info">
        <h2>{{ t('pageTitle') }}</h2>
        <div class="interview-meta" v-if="interviewStore.isInterviewing">
          <el-tag type="success" size="small">
            <el-icon><Timer /></el-icon>
            {{ formatDuration(elapsedSeconds) }}
          </el-tag>
          <el-tag :type="difficultyType" size="small">{{
            difficultyLabel
          }}</el-tag>
          <el-tag type="info" size="small"
            >{{ messages.length }} {{ t('messagesUnit') }}</el-tag
          >
          <el-tag
            v-if="elapsedSeconds >= interviewConfig.duration * 60"
            type="danger"
            size="small"
          >
            {{ t('timeUp') }}
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
          {{ t('startInterview') }}
        </el-button>
        <el-button
          v-else
          type="danger"
          size="large"
          @click="handleEndInterview"
        >
          <el-icon><VideoPause /></el-icon>
          {{ t('endInterview') }}
        </el-button>
      </div>
    </div>

    <!-- ==================== 面试配置对话框 ==================== -->
    <el-dialog
      v-model="showConfigDialog"
      :title="t('interviewConfig')"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="interviewConfig" label-width="100px">
        <el-form-item :label="t('position')">
          <el-select
            v-model="interviewConfig.position"
            :placeholder="t('selectPosition')"
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
        <el-form-item :label="t('difficulty')">
          <el-radio-group v-model="interviewConfig.difficulty">
            <el-radio value="easy">{{ t('easy') }}</el-radio>
            <el-radio value="medium">{{ t('medium') }}</el-radio>
            <el-radio value="hard">{{ t('hard') }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="t('duration')">
          <el-select
            v-model="interviewConfig.duration"
            :placeholder="t('selectDuration')"
            style="width: 100%"
          >
            <el-option :label="`15 ${t('minute')}`" :value="15" />
            <el-option :label="`30 ${t('minute')}`" :value="30" />
            <el-option :label="`45 ${t('minute')}`" :value="45" />
            <el-option :label="`60 ${t('minute')}`" :value="60" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('interviewType')">
          <el-radio-group v-model="interviewConfig.type">
            <el-radio value="technical">{{ t('technicalInterview') }}</el-radio>
            <el-radio value="behavioral">{{
              t('behavioralInterview')
            }}</el-radio>
            <el-radio value="mixed">{{ t('mixedInterview') }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showConfigDialog = false">{{
          t('cancel')
        }}</el-button>
        <el-button type="primary" @click="handleStartInterview">{{
          t('startInterview')
        }}</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 面试主体：左侧聊天 + 右侧评分面板 ==================== -->
    <div class="interview-body">
      <!-- 左侧：对话区域 -->
      <div class="chat-panel">
        <!-- 消息列表 -->
        <div class="message-list" ref="messageListRef">
          <!-- 空状态：未开始面试 -->
          <div
            v-if="!interviewStore.isInterviewing && messages.length === 0"
            class="empty-state"
          >
            <el-empty :description="t('emptyStartHint')">
              <template #image>
                <el-icon :size="80" color="#409eff"><ChatDotRound /></el-icon>
              </template>
            </el-empty>
          </div>

          <!-- 面试已结束的提示 -->
          <div
            v-if="!interviewStore.isInterviewing && messages.length > 0"
            class="interview-ended-banner"
          >
            <el-icon><CircleCheck /></el-icon>
            <span>{{ t('interviewEndedGenerating') }}</span>
          </div>

          <!-- 逐条消息渲染 -->
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="message-item"
            :class="msg.role"
          >
            <div class="message-avatar">
              <el-avatar
                :size="40"
                :icon="msg.role === 'assistant' ? 'Avatar' : 'User'"
                :class="msg.role"
              />
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-name">
                  {{ msg.role === 'assistant' ? t('aiInterviewer') : t('me') }}
                </span>
                <span class="message-time">{{
                  formatTime(msg.timestamp)
                }}</span>
              </div>
              <div
                class="message-body"
                :class="{
                  thinking: isStreamingMessage(msg.id) && !msg.content
                }"
              >
                <template v-if="msg.isAudio">
                  <p>{{ msg.content }}</p>
                  <div class="audio-message">
                    <el-icon><Microphone /></el-icon>
                    <span>{{ t('voiceTranscript') }}</span>
                  </div>
                </template>
                <!-- 文本消息：支持流式输出时逐字显示 -->
                <template v-else>
                  <p v-if="msg.content">
                    {{ msg.content
                    }}<span v-if="isStreamingMessage(msg.id)">▍</span>
                  </p>
                  <div
                    v-else-if="isStreamingMessage(msg.id)"
                    class="typing-indicator"
                  >
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- ==================== 输入区域 ==================== -->
        <div class="input-area" v-if="interviewStore.isInterviewing">
          <!-- 模式切换工具栏 -->
          <div class="input-toolbar">
            <el-button-group>
              <el-button
                :type="inputMode === 'text' ? 'primary' : 'default'"
                @click="switchToTextMode"
              >
                <el-icon><ChatLineSquare /></el-icon>
                {{ t('textInput') }}
              </el-button>
              <el-button
                :type="inputMode === 'voice' ? 'primary' : 'default'"
                @click="switchToVoiceMode"
              >
                <el-icon><Microphone /></el-icon>
                {{ t('voiceInput') }}
              </el-button>
            </el-button-group>
          </div>

          <!-- 文本输入模式 -->
          <div v-if="inputMode === 'text'" class="text-input">
            <el-input
              v-model="inputText"
              type="textarea"
              :rows="3"
              :placeholder="t('inputPlaceholder')"
              resize="none"
              @keydown.enter.exact.prevent="handleSendMessage"
            />
            <div class="input-actions">
              <span class="input-hint">{{ t('pressEnterHint') }}</span>
              <el-button
                type="primary"
                :disabled="!inputText.trim() || isLoading"
                @click="handleSendMessage"
              >
                <el-icon><Promotion /></el-icon>
                {{ t('send') }}
              </el-button>
            </div>
          </div>

          <!-- 语音输入模式 -->
          <div v-else class="voice-input">
            <div class="voice-status">
              <div
                class="voice-indicator"
                :class="{ recording: isRecording }"
                @mousedown="startRecording"
                @mouseup="stopRecording"
                @touchstart.prevent="startRecording"
                @touchend.prevent="stopRecording"
              >
                <el-icon :size="32" :color="isRecording ? '#fff' : '#409eff'">
                  <Microphone />
                </el-icon>
                <span v-if="isRecording" class="recording-ring ring-1"></span>
                <span v-if="isRecording" class="recording-ring ring-2"></span>
              </div>
              <!-- <p class="voice-hint">
                {{ isRecording ? t('recordingHint') : t('holdToTalk') }}
              </p> -->
            </div>
            <!-- 录音波形可视化 -->
            <!-- <div class="waveform-container" :class="{ active: isRecording }">
              <canvas ref="waveformCanvas" class="waveform-canvas"></canvas>
            </div> -->
          </div>
        </div>
      </div>

      <!-- ==================== 右侧：实时评分面板（ECharts） ==================== -->
      <div class="score-panel" v-if="interviewStore.isInterviewing">
        <h3 class="panel-title">{{ t('realtimeEval') }}</h3>

        <!-- 雷达图：技术 / 沟通 / 解决问题 三维评分 -->
        <div ref="radarChartRef" class="chart-wrapper radar"></div>

        <!-- 分数总览 -->
        <div class="score-overview">
          <div class="score-card">
            <span class="label">{{ t('overallScore') }}</span>
            <span class="value">{{ overallScore }}</span>
          </div>
          <div class="score-card">
            <span class="label">{{ t('techAbility') }}</span>
            <span class="value">{{ realtimeScores.technicalScore }}</span>
          </div>
          <div class="score-card">
            <span class="label">{{ t('communication') }}</span>
            <span class="value">{{ realtimeScores.communicationScore }}</span>
          </div>
          <div class="score-card">
            <span class="label">{{ t('problemSolving') }}</span>
            <span class="value">{{ realtimeScores.problemSolvingScore }}</span>
          </div>
        </div>

        <!-- 饼图：回答质量分布 -->
        <!-- <div ref="pieChartRef" class="chart-wrapper pie"></div> -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Interview.vue — AI 模拟面试主页面
 *
 * 功能概览：
 * 1. 用户可选择岗位、难度、时长，启动一场模拟面试
 * 2. 面试过程中支持「文本输入」和「语音输入（按住录音）」两种方式
 * 3. AI 回复采用 **Mock 模式下的模拟流式输出**，逐字追加到消息中
 *    - 真实环境可切换为 SSE / WebSocket，只需修改 `getAIResponse` 函数
 * 4. 右侧评分面板使用 ECharts 雷达图 + 饼图，随对话实时更新
 * 5. 面试结束后自动生成分析报告并跳转到 /report/:id
 *
 * 关键架构说明：
 * - Pinia（useInterviewStore）管理对话记录和面试状态
 * - audioService（Recorder-Core / MediaRecorder）处理语音录制与波形可视化
 * - api.ts 提供所有后端接口，MOCK_MODE 下返回模拟数据
 */

import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useInterviewStore, usePreferenceStore, useUserStore } from '@/store'
import { audioService } from '@/service/audio'
import { api } from '@/service/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as echarts from 'echarts'

// ==================== 路由 & Store ====================
const router = useRouter()
const interviewStore = useInterviewStore()
const userStore = useUserStore()
const preferenceStore = usePreferenceStore()
const t = (key: string) => {
  const en: Record<string, string> = {
    pageTitle: 'AI Interview',
    startInterview: 'Start Interview',
    endInterview: 'End Interview',
    interviewConfig: 'Interview Config',
    emptyStartHint: 'Click "Start Interview" to begin',
    aiInterviewer: 'AI Interviewer',
    me: 'Me',
    messagesUnit: 'messages',
    timeUp: 'Time is up!',
    position: 'Position',
    selectPosition: 'Select position',
    difficulty: 'Difficulty',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    duration: 'Duration',
    selectDuration: 'Select duration',
    minute: 'min',
    interviewType: 'Type',
    technicalInterview: 'Technical',
    behavioralInterview: 'Behavioral',
    mixedInterview: 'Mixed',
    cancel: 'Cancel',
    textInput: 'Text',
    voiceInput: 'Voice',
    inputPlaceholder: 'Type your answer, Enter to send',
    pressEnterHint: 'Press Enter to send',
    send: 'Send',
    recordingHint: 'Recording... release to send',
    holdToTalk: 'Hold to talk',
    interviewEndedGenerating: 'Interview ended, generating report...',
    voiceTranscript: 'Voice transcript',
    realtimeEval: 'Realtime Evaluation',
    overallScore: 'Overall',
    techAbility: 'Technical',
    communication: 'Communication',
    problemSolving: 'Problem Solving',
    emptyAiReply: 'No valid reply generated. Please retry.',
    aiReplyFailed: 'AI reply failed',
    interviewStarted: 'Interview started. Good luck!',
    getAiFailed: 'Failed to get AI reply',
    browserNoRecording: 'Your browser does not support recording',
    micNoPermission: 'Cannot access microphone',
    recordingDataFailed: 'Failed to get recording data',
    sttEmpty: 'No valid speech detected',
    sttFailed: 'Speech recognition failed',
    endConfirmText: 'End current interview and generate report?',
    confirmEnd: 'End',
    continueInterview: 'Continue'
  }
  if (preferenceStore.language === 'en-US') return en[key] || key
  return (
    {
      pageTitle: 'AI 模拟面试',
      startInterview: '开始面试',
      endInterview: '结束面试',
      interviewConfig: '面试配置',
      emptyStartHint: '点击上方「开始面试」按钮，开启 AI 模拟面试',
      aiInterviewer: 'AI 面试官',
      me: '我',
      messagesUnit: '条消息',
      timeUp: '时间到！',
      position: '应聘岗位',
      selectPosition: '请选择面试岗位',
      difficulty: '难度级别',
      easy: '简单',
      medium: '中等',
      hard: '困难',
      duration: '面试时长',
      selectDuration: '请选择面试时长',
      minute: '分钟',
      interviewType: '面试类型',
      technicalInterview: '技术面试',
      behavioralInterview: '行为面试',
      mixedInterview: '综合面试',
      cancel: '取消',
      textInput: '文本输入',
      voiceInput: '语音输入',
      inputPlaceholder: '请输入你的回答，按 Enter 发送，Shift+Enter 换行',
      pressEnterHint: '按 Enter 发送消息',
      send: '发送',
      recordingHint: '正在录音… 松开发送',
      holdToTalk: '按住说话',
      interviewEndedGenerating: '面试已结束，正在生成分析报告…',
      voiceTranscript: '语音转写',
      realtimeEval: '实时评估',
      overallScore: '综合评分',
      techAbility: '技术能力',
      communication: '沟通表达',
      problemSolving: '解决问题',
      emptyAiReply: '我这边暂时没有生成有效回复，请再试一次。',
      aiReplyFailed: 'AI 回复失败',
      interviewStarted: '面试已开始，祝你好运！',
      getAiFailed: '获取 AI 回复失败',
      browserNoRecording: '您的浏览器不支持语音录制',
      micNoPermission: '无法访问麦克风，请检查权限设置',
      recordingDataFailed: '录音数据获取失败，请重试',
      sttEmpty: '未识别到有效语音内容，请重试',
      sttFailed: '语音识别失败，请稍后重试',
      endConfirmText: '确定要结束当前面试吗？结束后将生成面试分析报告。',
      confirmEnd: '确定结束',
      continueInterview: '继续面试'
    }[key] || key
  )
}

/**
 * 生成模拟面试分析报告
 * 在结束面试时调用，为雷达图和报告页提供评分数据
 */
const generateMockAnalysis = () => {
  const tech = +(3 + Math.random() * 2).toFixed(1)
  const comm = +(3 + Math.random() * 2).toFixed(1)
  const prob = +(3 + Math.random() * 2).toFixed(1)
  return {
    technicalScore: tech,
    communicationScore: comm,
    problemSolvingScore: prob,
    overallScore: +((tech + comm + prob) / 3).toFixed(1),
    strengths: [
      '对核心技术概念有扎实的理解',
      '能够清晰地表达技术方案和思路',
      '具备良好的问题分析和解决能力'
    ],
    weaknesses: ['部分高级概念需要进一步深入学习', '系统设计经验有待积累'],
    suggestions: [
      '建议多参与大型项目实践，提升架构设计能力',
      '加强分布式系统和性能优化相关知识',
      '练习在白板上进行系统设计和算法推导'
    ]
  }
}

// ==================== 响应式状态 ====================
const showConfigDialog = ref(false)
const inputMode = ref<'text' | 'voice'>('text')
const inputText = ref('')
const isLoading = ref(false) // AI 是否正在回复
const isRecording = ref(false) // 是否正在录音
const streamingMessageId = ref<string | null>(null)
const messageListRef = ref<HTMLElement>() // 消息列表 DOM 引用（用于自动滚动）
const waveformCanvas = ref<HTMLCanvasElement>() // 录音波形 Canvas
const recordingPromise = ref<Promise<Blob> | null>(null)
const isStoppingRecording = ref(false)
const suppressRecordingSubmit = ref(false)
let recordingSessionId = 0
const currentRecordingSession = ref(0)
const radarChartRef = ref<HTMLElement>() // 雷达图容器
const pieChartRef = ref<HTMLElement>() // 饼图容器

// 面试配置（用户在对话框中选择）
const interviewConfig = ref({
  position: 'frontend',
  difficulty: 'medium' as 'easy' | 'medium' | 'hard',
  duration: 30,
  type: 'mixed' as 'technical' | 'behavioral' | 'mixed'
})

// 已经过的秒数（用于倒计时显示）
const elapsedSeconds = ref(0)

// 实时评分数据：随着对话轮次逐渐变化
const realtimeScores = ref({
  technicalScore: 3.0,
  communicationScore: 3.0,
  problemSolvingScore: 3.0
})

// 回答质量分布（用于饼图）
const answerQuality = ref({
  excellent: 0,
  good: 0,
  average: 0,
  poor: 0
})

// ==================== ECharts 实例 ====================
let radarChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

// ==================== 定时器句柄 ====================
let countdownTimer: ReturnType<typeof setInterval> | null = null
let animationFrameId: number | null = null
let messageIdSeed = 0
const handleChartResize = () => {
  radarChart?.resize()
  pieChart?.resize()
}

// ==================== 计算属性 ====================

/** 当前面试消息列表（从 Pinia store 读取） */
const messages = computed(() => interviewStore.currentInterview?.messages || [])

/** 综合评分（三个维度取平均） */
const overallScore = computed(() => {
  const s = realtimeScores.value
  return (
    (s.technicalScore + s.communicationScore + s.problemSolvingScore) /
    3
  ).toFixed(1)
})

/** 难度中文标签 */
const difficultyLabel = computed(() => {
  const labels: Record<string, string> = {
    easy: t('easy'),
    medium: t('medium'),
    hard: t('hard')
  }
  return labels[interviewConfig.value.difficulty]
})

/** 难度对应的 Tag 类型 */
const difficultyType = computed(() => {
  const types = { easy: 'success', medium: 'warning', hard: 'danger' } as const
  return types[interviewConfig.value.difficulty]
})

// ==================== 格式化工具 ====================

/** 格式化时间戳为 HH:MM */
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const createMessageId = (prefix: string = 'msg') => {
  messageIdSeed += 1
  return `${prefix}_${Date.now()}_${messageIdSeed}`
}

const switchToTextMode = async () => {
  if (inputMode.value === 'text') return
  if (isRecording.value) {
    suppressRecordingSubmit.value = true
    await stopRecording()
  }
  inputMode.value = 'text'
}

const switchToVoiceMode = () => {
  inputMode.value = 'voice'
}

/** 将秒数格式化为 mm:ss 或 h:mm:ss */
const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

// ==================== ECharts 初始化与更新 ====================

/**
 * 初始化 ECharts 雷达图
 * 展示「技术能力 / 沟通表达 / 解决问题」三个维度的实时评分
 */
const initRadarChart = () => {
  if (!radarChartRef.value) return
  radarChart?.dispose()
  radarChart = echarts.init(radarChartRef.value)
  updateRadarChart()
}

/** 更新雷达图数据 */
const updateRadarChart = () => {
  if (!radarChart) return
  const s = realtimeScores.value
  radarChart.setOption({
    tooltip: {},
    radar: {
      indicator: [
        { name: t('techAbility'), max: 5 },
        { name: t('communication'), max: 5 },
        { name: t('problemSolving'), max: 5 }
      ],
      shape: 'circle',
      splitNumber: 5,
      axisName: { color: '#606266', fontSize: 13 },
      splitArea: {
        areaStyle: { color: ['#fff', '#f5f7fa', '#fff', '#f5f7fa', '#fff'] }
      }
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: [
              s.technicalScore,
              s.communicationScore,
              s.problemSolvingScore
            ],
            name: t('realtimeEval'),
            areaStyle: { color: 'rgba(64,158,255,0.25)' },
            lineStyle: { color: '#409eff', width: 2 },
            itemStyle: { color: '#409eff' }
          }
        ]
      }
    ]
  })
}

/**
 * 初始化 ECharts 饼图
 * 展示回答质量分布：优秀 / 良好 / 一般 / 较差
 */
const initPieChart = () => {
  if (!pieChartRef.value) return
  pieChart?.dispose()
  pieChart = echarts.init(pieChartRef.value)
  updatePieChart()
}

/** 更新饼图数据 */
const updatePieChart = () => {
  if (!pieChart) return
  const q = answerQuality.value
  pieChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      confine: true,
      appendToBody: true,
      extraCssText: 'z-index: 9999;',
      position: (
        point: any,
        _params: any,
        _dom: any,
        _rect: any,
        size: any
      ) => {
        const x = Math.min(point[0] + 12, size.viewSize[0] - 160)
        const y = Math.max(point[1] - 28, 8)
        return [x, y]
      }
    },
    legend: { bottom: 0, textStyle: { fontSize: 12 }, selectedMode: false },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
        data: [
          {
            value: q.excellent,
            name: preferenceStore.language === 'en-US' ? 'Excellent' : '优秀',
            itemStyle: { color: '#67c23a' }
          },
          {
            value: q.good,
            name: preferenceStore.language === 'en-US' ? 'Good' : '良好',
            itemStyle: { color: '#409eff' }
          },
          {
            value: q.average,
            name: preferenceStore.language === 'en-US' ? 'Average' : '一般',
            itemStyle: { color: '#e6a23c' }
          },
          {
            value: q.poor,
            name: preferenceStore.language === 'en-US' ? 'Poor' : '较差',
            itemStyle: { color: '#f56c6c' }
          }
        ]
      }
    ]
  })
}

/**
 * 模拟实时评分更新
 * 每次收到 AI 回复后调用，随机微调三维评分并更新图表
 */
const updateRealtimeScores = () => {
  const s = realtimeScores.value
  // 随机微调 ±0.5，限制在 1~5 之间
  s.technicalScore = Math.min(
    5,
    Math.max(1, +(s.technicalScore + (Math.random() - 0.4) * 0.6).toFixed(1))
  )
  s.communicationScore = Math.min(
    5,
    Math.max(
      1,
      +(s.communicationScore + (Math.random() - 0.4) * 0.6).toFixed(1)
    )
  )
  s.problemSolvingScore = Math.min(
    5,
    Math.max(
      1,
      +(s.problemSolvingScore + (Math.random() - 0.4) * 0.6).toFixed(1)
    )
  )

  // 更新回答质量分布
  const rand = Math.random()
  if (rand > 0.7) answerQuality.value.excellent++
  else if (rand > 0.35) answerQuality.value.good++
  else if (rand > 0.1) answerQuality.value.average++
  else answerQuality.value.poor++

  // 刷新图表
  updateRadarChart()
  updatePieChart()
}

// ==================== AI 回复：支持模拟流式输出 ====================

/**
 * 获取 AI 回复并追加到消息列表
 *
 * 【Mock 模式】逐字追加文本，模拟 SSE 流式输出的视觉效果。
 * 【真实环境】可改为 EventSource / fetch SSE / WebSocket 接收后端流式数据。
 *
 * @param userContent - 用户发送的消息内容
 */
const getAIResponse = async (userContent?: string) => {
  const assistantMsg = {
    id: createMessageId('msg'),
    content: '',
    role: 'assistant' as const,
    timestamp: Date.now()
  }
  interviewStore.addMessage(assistantMsg)
  streamingMessageId.value = assistantMsg.id
  scrollToBottom()

  const positionLabels: Record<string, string> = {
    frontend: '前端开发工程师',
    backend: '后端开发工程师',
    fullstack: '全栈工程师',
    mobile: '移动端开发工程师',
    algorithm: '算法工程师',
    qa: '测试工程师'
  }

  const system = `你正在进行一场 AI 模拟面试。岗位：${
    positionLabels[interviewConfig.value.position] ||
    interviewConfig.value.position
  }；难度：${difficultyLabel.value}；面试类型：${
    interviewConfig.value.type
  }。请用中文进行面试，每次只问一个问题，语气专业但友好。`

  const history = (interviewStore.currentInterview?.messages || [])
    .filter(m => m.id !== assistantMsg.id)
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))

  const messagesToSend = userContent
    ? [{ role: 'system' as const, content: system }, ...history]
    : [
        { role: 'system' as const, content: system },
        {
          role: 'user' as const,
          content: '请以面试官身份进行开场白，并先请候选人做一个简短自我介绍。'
        }
      ]

  let finalError: any = null
  let hasContent = false

  for (let attempt = 0; attempt < 2; attempt++) {
    let streamError: any = null
    let finalText = ''
    let gotChunk = false

    if (attempt > 0) {
      assistantMsg.content = ''
      scrollToBottom()
    }

    await api.gpt.streamChatSSE(
      messagesToSend,
      {
        onChunk: chunk => {
          gotChunk = true
          const msgs = interviewStore.currentInterview?.messages
          if (!msgs) return
          const target = msgs.find(m => m.id === assistantMsg.id)
          if (!target) return
          target.content += chunk
          scrollToBottom()
        },
        onDone: fullText => {
          finalText = fullText
          const msgs = interviewStore.currentInterview?.messages
          if (!msgs) return
          const target = msgs.find(m => m.id === assistantMsg.id)
          if (!target) return
          target.content = fullText || target.content
        },
        onError: err => {
          streamError = err
        }
      },
      undefined
    )

    if (streamError) {
      finalError = streamError
      if (
        streamError.message.includes('重新登录') ||
        streamError.message.includes('401')
      ) {
        streamingMessageId.value = null
        userStore.logout()
        interviewStore.endInterview()
        router.push('/login')
        ElMessage.error(streamError.message || '登录状态已失效')
        return
      }
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, 300))
        continue
      }
      break
    }

    hasContent = gotChunk || !!finalText.trim() || !!assistantMsg.content.trim()
    if (hasContent) break
    if (attempt === 0) {
      await new Promise(r => setTimeout(r, 300))
    }
  }

  streamingMessageId.value = null

  if (!hasContent) {
    const msgs = interviewStore.currentInterview?.messages
    if (msgs) {
      const target = msgs.find(m => m.id === assistantMsg.id)
      if (target && !target.content.trim()) {
        target.content = t('emptyAiReply')
      }
    }
    if (finalError) {
      ElMessage.error(finalError.message || t('aiReplyFailed'))
    }
    return
  }

  updateRealtimeScores()
}

const isStreamingMessage = (msgId: string) => {
  return isLoading.value && streamingMessageId.value === msgId
}

// ==================== 面试流程 ====================

/**
 * 开始面试
 * 1. 在 Pinia 中创建新的面试记录
 * 2. 启动倒计时
 * 3. 初始化 ECharts 图表
 * 4. 发送 AI 面试官开场白（流式输出）
 */
const handleStartInterview = async () => {
  const positionLabels: Record<string, string> = {
    frontend: '前端开发工程师',
    backend: '后端开发工程师',
    fullstack: '全栈工程师',
    mobile: '移动端开发工程师',
    algorithm: '算法工程师',
    qa: '测试工程师'
  }

  const title = `${positionLabels[interviewConfig.value.position]} - ${
    difficultyLabel.value
  }难度`
  interviewStore.startNewInterview(title)
  showConfigDialog.value = false

  // 立即推入一条静态欢迎语，提升用户体验
  interviewStore.addMessage({
    id: createMessageId('msg_welcome'),
    content: `你好！我是你的 AI 面试官。我已经收到了你的面试配置：${title}。准备好的话，请做一个简短的自我介绍吧。`,
    role: 'assistant',
    timestamp: Date.now()
  })

  // 重置计时器和评分
  elapsedSeconds.value = 0
  realtimeScores.value = {
    technicalScore: 3.0,
    communicationScore: 3.0,
    problemSolvingScore: 3.0
  }
  answerQuality.value = { excellent: 0, good: 0, average: 0, poor: 0 }

  // 启动每秒倒计时
  countdownTimer = setInterval(() => {
    elapsedSeconds.value++
    // 面试时间到达，自动结束
    if (elapsedSeconds.value >= interviewConfig.value.duration * 60) {
      handleEndInterview()
    }
  }, 1000)

  // 初始化图表（需要 DOM 已渲染，所以 nextTick）
  await nextTick()
  initRadarChart()
  initPieChart()

  scrollToBottom()

  ElMessage.success(t('interviewStarted'))
}

/**
 * 用户发送文本消息
 * 1. 将用户消息添加到 store
 * 2. 调用 AI 回复（流式输出）
 */
const handleSendMessage = async () => {
  const content = inputText.value.trim()
  if (!content || isLoading.value) return

  // 添加用户消息
  interviewStore.addMessage({
    id: createMessageId('msg'),
    content,
    role: 'user',
    timestamp: Date.now()
  })
  inputText.value = ''
  scrollToBottom()

  // AI 流式回复
  isLoading.value = true
  try {
    await getAIResponse(content)
    scrollToBottom()
  } catch (error) {
    ElMessage.error(t('getAiFailed'))
    console.error(error)
  } finally {
    isLoading.value = false
  }
}

// ==================== 语音录制 ====================

/**
 * 开始录音
 * 通过 audioService（MediaRecorder）获取麦克风权限并录制音频
 */
const startRecording = async () => {
  if (isLoading.value || isRecording.value || isStoppingRecording.value) return
  if (!audioService.isRecordingSupported()) {
    ElMessage.error(t('browserNoRecording'))
    return
  }
  try {
    recordingSessionId += 1
    currentRecordingSession.value = recordingSessionId
    streamingMessageId.value = null
    suppressRecordingSubmit.value = false
    isRecording.value = true
    recordingPromise.value = null
    recordingPromise.value = audioService.startRecording()
    startWaveformAnimation()
    window.addEventListener('mouseup', stopRecording)
    window.addEventListener('touchend', stopRecording)
  } catch (error) {
    ElMessage.error(t('micNoPermission'))
    isRecording.value = false
    recordingPromise.value = null
  }
}

/**
 * 停止录音并发送语音消息
 * 1. 停止 MediaRecorder
 * 2. 将录音以「语音消息」形式添加到对话
 * 3. 调用 AI 流式回复
 */
const stopRecording = async () => {
  if (!isRecording.value || isStoppingRecording.value) return
  try {
    isStoppingRecording.value = true
    const sessionId = currentRecordingSession.value
    isRecording.value = false
    window.removeEventListener('mouseup', stopRecording)
    window.removeEventListener('touchend', stopRecording)
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    audioService.stopRecording()
    const audioBlob = recordingPromise.value
      ? await recordingPromise.value
      : null
    recordingPromise.value = null
    if (!audioBlob) {
      ElMessage.error(t('recordingDataFailed'))
      return
    }
    if (sessionId !== currentRecordingSession.value) return
    if (suppressRecordingSubmit.value) return

    const sttRes = await api.gpt.speechToText(audioBlob)
    const transcript = (sttRes.data?.text || '').trim()
    if (!transcript) {
      ElMessage.warning(t('sttEmpty'))
      return
    }

    isLoading.value = true
    interviewStore.addMessage({
      id: createMessageId('msg'),
      content: transcript,
      role: 'user',
      timestamp: Date.now(),
      isAudio: true
    })
    scrollToBottom()

    await getAIResponse(transcript)
    scrollToBottom()
  } catch (error) {
    ElMessage.error(t('sttFailed'))
    console.error('录音失败:', error)
  } finally {
    isLoading.value = false
    recordingPromise.value = null
    isStoppingRecording.value = false
    suppressRecordingSubmit.value = false
    window.removeEventListener('mouseup', stopRecording)
    window.removeEventListener('touchend', stopRecording)
  }
}

/**
 * 录音波形动画
 * 利用 audioService.getWaveformData() 获取实时音频波形数据，在 Canvas 上绘制
 */
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
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0)
    gradient.addColorStop(0, '#67c23a')
    gradient.addColorStop(0.5, '#409eff')
    gradient.addColorStop(1, '#a855f7')
    ctx.lineWidth = 2.5
    ctx.strokeStyle = gradient
    ctx.shadowColor = 'rgba(64, 158, 255, 0.45)'
    ctx.shadowBlur = 6
    ctx.beginPath()

    const sliceWidth = canvas.width / data.length
    let x = 0
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128.0
      const y = (v * canvas.height) / 2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
      x += sliceWidth
    }
    ctx.lineTo(canvas.width, canvas.height / 2)
    ctx.stroke()
    ctx.shadowBlur = 0

    ctx.beginPath()
    ctx.strokeStyle = 'rgba(64, 158, 255, 0.22)'
    ctx.lineWidth = 1
    ctx.moveTo(0, canvas.height / 2)
    ctx.lineTo(canvas.width, canvas.height / 2)
    ctx.stroke()

    animationFrameId = requestAnimationFrame(draw)
  }
  draw()
}

/**
 * 结束面试
 * 1. 二次确认
 * 2. 停止计时器和图表
 * 3. 生成分析报告
 * 4. 跳转到报告页
 */
const handleEndInterview = async () => {
  try {
    await ElMessageBox.confirm(t('endConfirmText'), t('endInterview'), {
      confirmButtonText: t('confirmEnd'),
      cancelButtonText: t('continueInterview'),
      type: 'warning'
    })
  } catch {
    // 用户取消
    return
  }

  // 保存面试 ID（endInterview 会清空 currentInterview）
  const interviewId = interviewStore.currentInterview?.id || ''

  // 清理倒计时
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }

  // 生成分析报告并结束面试
  const analysis = generateMockAnalysis()
  interviewStore.endInterview(analysis)

  // 销毁 ECharts 实例
  radarChart?.dispose()
  radarChart = null
  pieChart?.dispose()
  pieChart = null

  ElMessage.success(t('interviewEndedGenerating'))

  // 跳转到报告页
  setTimeout(() => {
    router.push(`/report/${interviewId}`)
  }, 1000)
}

// ==================== 自动滚动 ====================

/** 将消息列表滚动到底部 */
const scrollToBottom = () => {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

// 监听消息变化自动滚动
watch(messages, () => scrollToBottom(), { deep: true })

// ==================== 生命周期 ====================

onMounted(() => {
  scrollToBottom()
  if (interviewStore.isInterviewing) {
    nextTick(() => {
      initRadarChart()
      initPieChart()
      handleChartResize()
    })
  }
  window.addEventListener('resize', handleChartResize)
})

watch(
  () => interviewStore.isInterviewing,
  val => {
    if (val) {
      nextTick(() => {
        initRadarChart()
        initPieChart()
        updateRadarChart()
        updatePieChart()
      })
      return
    }
    radarChart?.dispose()
    radarChart = null
    pieChart?.dispose()
    pieChart = null
  }
)

onUnmounted(() => {
  // 清理所有定时器和动画
  if (countdownTimer) clearInterval(countdownTimer)
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  window.removeEventListener('resize', handleChartResize)
  radarChart?.dispose()
  pieChart?.dispose()
})
</script>

<style lang="scss" scoped>
/* ==================== 布局 ==================== */
.interview-container {
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

/* ==================== 顶部栏 ==================== */
.interview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #ebeef5;
  background: #1f2937;
  color: #fff;
  flex-shrink: 0;

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

/* ==================== 主体区域：左聊天 + 右评分 ==================== */
.interview-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ==================== 左侧聊天面板 ==================== */
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; // 防止 flex 子元素溢出
}

/* ==================== 消息列表 ==================== */
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

  .interview-ended-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: center;
    padding: 12px;
    margin-bottom: 16px;
    background: #f0f9eb;
    border-radius: 8px;
    color: #67c23a;
    font-size: 14px;
  }

  .message-item {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;

    /* 用户消息靠右 */
    &.user {
      flex-direction: row-reverse;

      .message-content {
        align-items: flex-end;

        .message-body {
          background: #409eff;
          color: #fff;
          border-radius: 16px 16px 4px 16px;
        }
      }
    }

    /* AI 消息靠左 */
    &.assistant {
      .message-content {
        .message-body {
          background: #fff;
          border-radius: 16px 16px 16px 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
      }
    }

    /* 加载指示器 */
    &.loading {
      .message-content {
        padding: 16px 20px;
        background: #fff;
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
        min-height: 22px;

        p {
          margin: 0;
          white-space: pre-wrap;
        }

        &.thinking {
          padding: 14px 16px;
          min-width: 72px;
        }

        .audio-message {
          display: flex;
          align-items: center;
          gap: 8px;
        }
      }
    }
  }

  /* 打字动画 */
  .typing-indicator {
    display: flex;
    gap: 4px;
    align-items: center;
    min-height: 16px;

    span {
      width: 8px;
      height: 8px;
      background: #b0b7c3;
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

/* ==================== 输入区域 ==================== */
.input-area {
  padding: 16px 24px;
  border-top: 1px solid #ebeef5;
  background: #fff;
  flex-shrink: 0;

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
        width: 220px;
        height: 56px;
        border-radius: 28px;
        background: #eef2f7;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s;
        border: 1px solid #d4dde8;
        gap: 10px;
        position: relative;
        box-shadow: 0 2px 10px rgba(31, 41, 55, 0.08);

        &.recording {
          background: #334155;
          border-color: transparent;
          box-shadow: 0 6px 16px rgba(51, 65, 85, 0.35);

          :deep(.el-icon) {
            transform: scale(1.08);
            transition: transform 0.2s;
          }
        }

        &:hover {
          transform: scale(1.05);
        }

        &::after {
          content: '按住说话';
          font-size: 15px;
          font-weight: 600;
          color: #334155;
        }

        &.recording::after {
          content: '松开发送';
          color: #fff;
        }

        .recording-ring {
          position: absolute;
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          left: -2px;
          right: -2px;
          top: -2px;
          bottom: -2px;
          pointer-events: none;
          animation: ringPulse 1.5s infinite ease-out;
        }

        .ring-2 {
          animation-delay: 0.45s;
        }
      }

      .voice-hint {
        margin-top: 12px;
        font-size: 13px;
        color: #8a94a6;
        min-height: 20px;
      }
    }

    .waveform-container {
      width: 100%;
      margin-top: 20px;
      height: 72px;
      opacity: 1;
      transition: all 0.2s;
      border-radius: 10px;
      background: linear-gradient(180deg, #f6f8fc 0%, #eef3ff 100%);
      border: 1px solid #e1e8f8;
      display: flex;
      align-items: center;
      padding: 6px 8px;

      &.active {
        box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.16);
        border-color: #9dc0ff;
      }

      .waveform-canvas {
        width: 100%;
        height: 60px;
        background: transparent;
        border-radius: 8px;
      }
    }
  }
}

/* ==================== 右侧评分面板 ==================== */
.score-panel {
  width: 300px;
  flex-shrink: 0;
  border-left: 1px solid #ebeef5;
  background: #fafbfc;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .panel-title {
    margin: 0 0 8px 0;
    font-size: 16px;
    color: #303133;
    text-align: center;
  }

  .chart-wrapper {
    width: 100%;
    height: 175px;
  }

  .chart-wrapper.radar {
    height: 160px;
  }

  .chart-wrapper.pie {
    height: 180px;
  }

  .score-overview {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;

    .score-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 8px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);

      .label {
        font-size: 12px;
        color: #909399;
        margin-bottom: 4px;
      }

      .value {
        font-size: 22px;
        font-weight: 700;
        color: #2563eb;
      }
    }
  }
}

@media (max-width: 1200px) {
  .interview-container {
    height: auto;
    min-height: calc(100vh - 120px);
  }

  .interview-body {
    flex-direction: column;
  }

  .score-panel {
    width: 100%;
    border-left: none;
    border-top: 1px solid #ebeef5;
  }
}

@media (max-width: 768px) {
  .interview-header {
    padding: 14px;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .message-list {
    padding: 12px;

    .message-item {
      gap: 10px;

      .message-content {
        max-width: 84%;
      }
    }
  }

  .input-area {
    padding: 12px;

    .voice-input {
      padding: 8px 0;

      .voice-status {
        width: 100%;

        .voice-indicator {
          width: 100%;
          max-width: 280px;
        }
      }
    }
  }
}

html[data-theme='dark'] .interview-container {
  background: #121417;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
}

html[data-theme='dark'] .interview-header {
  border-bottom-color: #2c323a;
}

html[data-theme='dark'] .message-list {
  background: #161a1f;
}

html[data-theme='dark'] .message-list .message-item.assistant .message-body {
  background: #252b33;
  color: #e7ecf3;
}

html[data-theme='dark'] .message-list .message-item.user .message-body {
  background: #3f67f0;
}

html[data-theme='dark'] .input-area {
  background: #171b20;
  border-top-color: #2c323a;
}

html[data-theme='dark'] .input-area .voice-input .voice-indicator {
  background: #202733;
  border-color: #364153;
}

html[data-theme='dark'] .input-area .waveform-container .waveform-canvas {
  background: #1f252d;
}

html[data-theme='dark'] .input-area .waveform-container {
  background: linear-gradient(180deg, #1e2530 0%, #1a2029 100%);
  border-color: #334055;
}

html[data-theme='dark'] .input-area .waveform-container.active {
  box-shadow: 0 0 0 3px rgba(126, 162, 255, 0.2);
}

html[data-theme='dark'] .score-panel {
  background: #171b20;
  border-left-color: #2c323a;
}

html[data-theme='dark'] .score-panel .panel-title {
  color: #e7ecf3;
}

html[data-theme='dark'] .score-panel .score-overview .score-card {
  background: #222932;
}

/* ==================== 动画 ==================== */
@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.4);
  }
  50% {
    box-shadow: 0 0 0 20px rgba(245, 108, 108, 0);
  }
}

@keyframes ringPulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.1);
    opacity: 0;
  }
}
</style>
