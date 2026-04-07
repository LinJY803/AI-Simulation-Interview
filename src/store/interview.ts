/**
 * store/interview.ts — 面试全局状态管理（Pinia）
 *
 * 管理面试相关的所有全局状态，包括：
 * - 当前进行中的面试（对话记录、计时、状态）
 * - 历史面试列表
 * - AI 实时评分数据
 * - 录音相关状态
 *
 * ── 使用方式 ──────────────────────────────────────────
 * ```
 * import { useInterviewStore } from '@/store'
 *
 * const store = useInterviewStore()
 *
 * // 开始面试
 * store.startNewInterview('前端开发工程师 - 中等难度')
 *
 * // 添加消息
 * store.addMessage({ id: 'm1', content: '你好', role: 'user', timestamp: Date.now() })
 *
 * // 获取当前消息列表
 * const messages = store.currentInterview?.messages
 *
 * // 结束面试
 * store.endInterview(analysis)
 *
 * // 获取历史统计
 * const stats = store.getInterviewStats
 * ```
 */

import { defineStore } from 'pinia'

// ==================== 类型定义 ====================

/**
 * 面试消息
 * 对应一轮对话中的一条消息，可以是用户输入或 AI 回复。
 */
export interface InterviewMessage {
  /** 消息唯一 ID */
  id: string
  /** 消息内容（文本或语音转写文字） */
  content: string
  /** 消息角色：user=用户, assistant=AI面试官, system=系统提示 */
  role: 'user' | 'assistant' | 'system'
  /** 消息时间戳（毫秒） */
  timestamp: number
  /** 是否为语音消息 */
  isAudio?: boolean
  /** 语音音频 URL（语音消息可播放） */
  audioUrl?: string
}

/**
 * AI 面试分析报告
 * 在面试结束后由 AI 自动生成，包含多维度评分和建议。
 */
export interface InterviewAnalysis {
  /** 技术能力评分（1-5 分，保留 1 位小数） */
  technicalScore: number
  /** 沟通表达能力评分 */
  communicationScore: number
  /** 解决问题能力评分 */
  problemSolvingScore: number
  /** 综合评分（三项平均） */
  overallScore: number
  /** 候选人优势列表 */
  strengths: string[]
  /** 候选人待提升项 */
  weaknesses: string[]
  /** 改进建议 */
  suggestions: string[]
}

/**
 * 面试记录
 * 代表一场完整的面试，包含元信息、对话内容和最终分析。
 */
export interface InterviewRecord {
  /** 面试唯一 ID */
  id: string
  /** 面试标题（如 "前端开发工程师 - 中等难度"） */
  title: string
  /** 面试开始时间戳（毫秒） */
  startTime: number
  /** 面试结束时间戳 */
  endTime: number
  /** 面试持续时长（毫秒） */
  duration: number
  /** 面试状态 */
  status: InterviewStatus
  /** 面试总分（1-5） */
  score?: number
  /** 对话消息列表 */
  messages: InterviewMessage[]
  /** 面试分析报告（结束后生成） */
  analysis?: InterviewAnalysis
}

/** 面试状态枚举 */
export type InterviewStatus = 'ongoing' | 'completed' | 'canceled'

/**
 * 实时评分快照
 * 随着对话进行，评分会在每次 AI 回复后动态变化。
 */
export interface RealtimeScores {
  /** 技术能力评分（1-5） */
  technicalScore: number
  /** 沟通表达能力评分（1-5） */
  communicationScore: number
  /** 解决问题能力评分（1-5） */
  problemSolvingScore: number
}

/**
 * 回答质量统计
 * 用于饼图展示：每次 AI 回复后根据随机或评分逻辑归类。
 */
export interface AnswerQuality {
  /** 优秀回答次数 */
  excellent: number
  /** 良好回答次数 */
  good: number
  /** 一般回答次数 */
  average: number
  /** 较差回答次数 */
  poor: number
}

/**
 * 面试配置
 * 用户在开始面试前选择的参数。
 */
export interface InterviewConfig {
  /** 应聘岗位 key */
  position: string
  /** 难度级别 */
  difficulty: 'easy' | 'medium' | 'hard'
  /** 面试时长（分钟） */
  duration: number
  /** 面试类型 */
  type: 'technical' | 'behavioral' | 'mixed'
}

/** 岗位 key → 中文标签映射 */
export const POSITION_LABELS: Record<string, string> = {
  frontend: '前端开发工程师',
  backend: '后端开发工程师',
  fullstack: '全栈工程师',
  mobile: '移动端开发工程师',
  algorithm: '算法工程师',
  qa: '测试工程师',
}

/** 难度 key → 中文标签映射 */
export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

/** 难度 key → Element Plus Tag type 映射 */
export const DIFFICULTY_TAG_TYPES: Record<string, 'success' | 'warning' | 'danger'> = {
  easy: 'success',
  medium: 'warning',
  hard: 'danger',
}

// ==================== Store 定义 ====================

export const useInterviewStore = defineStore('interview', {
  // ── State：响应式数据 ──────────────────────────────────
  state: (): {
    /** 当前正在进行中的面试（为 null 表示没有活跃面试） */
    currentInterview: InterviewRecord | null
    /** 所有历史面试记录（按时间倒序） */
    interviewHistory: InterviewRecord[]
    /** 是否正在面试中 */
    isInterviewing: boolean
    /** 是否正在录音 */
    isRecording: boolean
    /** 最近一次录音产生的音频 Blob */
    audioBlob: Blob | null
    /** AI 实时评分（随对话动态变化） */
    realtimeScores: RealtimeScores
    /** 回答质量统计（用于饼图） */
    answerQuality: AnswerQuality
    /** 当前面试配置 */
    config: InterviewConfig
    /** 已经过的秒数（用于倒计时） */
    elapsedSeconds: number
  } => ({
    currentInterview: null,
    interviewHistory: [],
    isInterviewing: false,
    isRecording: false,
    audioBlob: null,
    realtimeScores: {
      technicalScore: 3.0,
      communicationScore: 3.0,
      problemSolvingScore: 3.0,
    },
    answerQuality: { excellent: 0, good: 0, average: 0, poor: 0 },
    config: {
      position: 'frontend',
      difficulty: 'medium',
      duration: 30,
      type: 'mixed',
    },
    elapsedSeconds: 0,
  }),

  // ── Actions：修改状态的方法 ────────────────────────────
  actions: {
    /**
     * 开始一场新面试
     * 创建新的 InterviewRecord 并重置计时和评分状态。
     *
     * @param title - 面试标题，通常由岗位+难度拼接
     *
     * 使用示例：
     * store.startNewInterview('前端开发工程师 - 中等难度')
     */
    startNewInterview(title: string = '新面试') {
      this.currentInterview = {
        id: `interview_${Date.now()}`,
        title,
        startTime: Date.now(),
        endTime: 0,
        duration: 0,
        status: 'ongoing',
        messages: [],
      }
      this.isInterviewing = true

      // 重置实时评分和质量统计
      this.realtimeScores = { technicalScore: 3.0, communicationScore: 3.0, problemSolvingScore: 3.0 }
      this.answerQuality = { excellent: 0, good: 0, average: 0, poor: 0 }
      this.elapsedSeconds = 0
    },

    /**
     * 向当前面试添加一条消息
     * 消息会被追加到 currentInterview.messages 数组末尾。
     *
     * @param message - 完整的 InterviewMessage 对象
     *
     * 使用示例：
     * store.addMessage({
     *   id: 'msg_123',
     *   content: '你好，我有3年经验...',
     *   role: 'user',
     *   timestamp: Date.now(),
     * })
     */
    addMessage(message: InterviewMessage) {
      if (this.currentInterview) {
        this.currentInterview.messages.push(message)
      }
    },

    /**
     * 更新最后一条消息的内容
     * 用于流式输出场景：AI 回复逐字到达时，持续更新最后一条 assistant 消息。
     *
     * @param content - 最新的完整内容
     *
     * 使用示例：
     * // 流式输出每收到一个 chunk
     * store.updateLastMessageContent(fullTextSoFar)
     */
    updateLastMessageContent(content: string) {
      if (this.currentInterview && this.currentInterview.messages.length > 0) {
        this.currentInterview.messages[this.currentInterview.messages.length - 1].content = content
      }
    },

    /**
     * 结束当前面试
     * 将面试标记为已完成，计算时长，附加分析报告，归档到历史列表。
     * 调用后 currentInterview 会被清空。
     *
     * @param analysis - 可选，AI 生成的面试分析报告
     *
     * 使用示例：
     * store.endInterview({
     *   technicalScore: 4.2,
     *   communicationScore: 3.8,
     *   problemSolvingScore: 4.0,
     *   overallScore: 4.0,
     *   strengths: ['...'],
     *   weaknesses: ['...'],
     *   suggestions: ['...'],
     * })
     *
     * 注意：调用此方法前，如果需要 interviewId，请提前保存：
     * const id = store.currentInterview?.id
     * store.endInterview(analysis)
     * router.push(`/report/${id}`) // id 仍然可用
     */
    endInterview(analysis?: InterviewAnalysis) {
      if (this.currentInterview) {
        const now = Date.now()
        this.currentInterview.endTime = now
        this.currentInterview.duration = now - this.currentInterview.startTime
        this.currentInterview.status = 'completed'
        this.currentInterview.analysis = analysis
        this.currentInterview.score = analysis?.overallScore || 0

        // 归档到历史列表（插到最前面）
        this.interviewHistory.unshift(this.currentInterview)

        // 清空当前面试
        this.currentInterview = null
        this.isInterviewing = false
      }
    },

    /**
     * 取消面试（不生成报告）
     * 将面试标记为 canceled 并归档。
     */
    cancelInterview() {
      if (this.currentInterview) {
        const now = Date.now()
        this.currentInterview.endTime = now
        this.currentInterview.duration = now - this.currentInterview.startTime
        this.currentInterview.status = 'canceled'
        this.interviewHistory.unshift(this.currentInterview)
        this.currentInterview = null
        this.isInterviewing = false
      }
    },

    /**
     * 更新实时评分
     * 每次 AI 回复完成后调用，微调三维评分并更新回答质量统计。
     *
     * @param delta - 可选，每个维度的变化量（默认随机 ±0.6）
     *
     * 使用示例：
     * store.updateScores() // 随机微调
     * store.updateScores({ technicalScore: +0.3 }) // 手动调整
     */
    updateScores(delta?: Partial<RealtimeScores>) {
      const s = this.realtimeScores
      // 如果传入了指定维度的变化量，使用它；否则随机
      s.technicalScore = clamp(
        s.technicalScore + (delta?.technicalScore ?? (Math.random() - 0.4) * 0.6),
        1, 5,
      )
      s.communicationScore = clamp(
        s.communicationScore + (delta?.communicationScore ?? (Math.random() - 0.4) * 0.6),
        1, 5,
      )
      s.problemSolvingScore = clamp(
        s.problemSolvingScore + (delta?.problemSolvingScore ?? (Math.random() - 0.4) * 0.6),
        1, 5,
      )

      // 四舍五入到 1 位小数
      s.technicalScore = +s.technicalScore.toFixed(1)
      s.communicationScore = +s.communicationScore.toFixed(1)
      s.problemSolvingScore = +s.problemSolvingScore.toFixed(1)

      // 更新回答质量分布
      const overall = (s.technicalScore + s.communicationScore + s.problemSolvingScore) / 3
      if (overall >= 4.0) this.answerQuality.excellent++
      else if (overall >= 3.0) this.answerQuality.good++
      else if (overall >= 2.0) this.answerQuality.average++
      else this.answerQuality.poor++
    },

    /**
     * 设置面试配置
     * @param config - 部分或全部配置项
     */
    setConfig(config: Partial<InterviewConfig>) {
      Object.assign(this.config, config)
    },

    /**
     * 增加面试已用秒数
     * 由 Interview.vue 中的 setInterval 每秒调用。
     */
    tickElapsed() {
      this.elapsedSeconds++
    },

    /**
     * 设置录音状态
     * @param isRecording - 是否正在录音
     */
    setRecording(isRecording: boolean) {
      this.isRecording = isRecording
    },

    /**
     * 保存录音 Blob
     * @param blob - 录音产生的音频 Blob
     */
    setAudioBlob(blob: Blob) {
      this.audioBlob = blob
    },

    /** 清除录音 Blob */
    clearAudioBlob() {
      this.audioBlob = null
    },

    /**
     * 清空历史记录
     * 慎用：此操作不可恢复。
     */
    clearHistory() {
      this.interviewHistory = []
    },

    /**
     * 根据面试状态筛选历史记录
     * @param status - 状态筛选条件
     * @returns 筛选后的面试记录数组
     */
    filterHistoryByStatus(status: InterviewStatus): InterviewRecord[] {
      return this.interviewHistory.filter((i) => i.status === status)
    },
  },

  // ── Getters：计算属性 ──────────────────────────────────
  getters: {
    /**
     * 当前面试的消息列表
     * 如果没有活跃面试，返回空数组。
     */
    currentMessages: (state): InterviewMessage[] => {
      return state.currentInterview?.messages || []
    },

    /**
     * 当前面试的消息数量
     */
    messageCount: (state): number => {
      return state.currentInterview?.messages.length || 0
    },

    /**
     * 综合评分（三维平均值，保留 1 位小数）
     */
    overallScore: (state): number => {
      const s = state.realtimeScores
      return +((s.technicalScore + s.communicationScore + s.problemSolvingScore) / 3).toFixed(1)
    },

    /**
     * 面试总统计数据
     * 包括总次数、完成次数、平均分、总时长。
     *
     * 使用示例：
     * const stats = store.getInterviewStats
     * console.log(stats.averageScore) // 4.1
     */
    getInterviewStats: (state) => {
      const completed = state.interviewHistory.filter((i) => i.status === 'completed')
      const avgScore =
        completed.length > 0
          ? completed.reduce((sum, i) => sum + (i.score || 0), 0) / completed.length
          : 0
      const totalDuration = completed.reduce((sum, i) => sum + i.duration, 0)

      return {
        /** 总面试次数 */
        totalCount: state.interviewHistory.length,
        /** 已完成次数 */
        completedCount: completed.length,
        /** 平均评分（1-5） */
        averageScore: +avgScore.toFixed(1),
        /** 总面试时长（毫秒） */
        totalDuration,
        /** 总面试时长（格式化字符串） */
        totalDurationFormatted: formatMsToReadable(totalDuration),
      }
    },

    /**
     * 根据 ID 获取某次面试记录
     * @param id - 面试 ID
     * @returns 匹配的面试记录或 undefined
     *
     * 使用示例：
     * const detail = store.getInterviewById('interview_123')
     * console.log(detail?.analysis?.overallScore)
     */
    getInterviewById: (state) => {
      return (id: string): InterviewRecord | undefined => {
        return state.interviewHistory.find((i) => i.id === id)
      }
    },

    /**
     * 获取最近 N 条面试记录
     * @param count - 返回数量（默认 5）
     *
     * 使用示例：
     * const recent = store.getRecentInterviews(3)
     */
    getRecentInterviews: (state) => {
      return (count: number = 5): InterviewRecord[] => {
        return state.interviewHistory.slice(0, count)
      }
    },

    /**
     * 面试时间是否已用尽
     * 用于判断是否应该自动结束面试。
     */
    isTimeUp: (state): boolean => {
      if (!state.currentInterview) return false
      // config.duration 是分钟，elapsedSeconds 是秒
      return state.elapsedSeconds >= state.config.duration * 60
    },

    /**
     * 当前面试已进行的格式化时长（mm:ss 或 h:mm:ss）
     */
    formattedElapsed: (state): string => {
      return formatSeconds(state.elapsedSeconds)
    },

    /**
     * 当前面试配置的难度中文标签
     */
    difficultyLabel: (state): string => {
      return DIFFICULTY_LABELS[state.config.difficulty] || '中等'
    },

    /**
     * 当前面试配置的难度对应 Tag 类型
     */
    difficultyTagType: (state): 'success' | 'warning' | 'danger' => {
      return DIFFICULTY_TAG_TYPES[state.config.difficulty] || 'warning'
    },
  },
})

// ==================== 工具函数 ====================

/** 将数值限制在 [min, max] 范围内 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** 将秒数格式化为 mm:ss 或 h:mm:ss */
function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * 将毫秒时长格式化为可读字符串
 * 例如：1800000 → "30分钟", 5400000 → "1小时30分钟"
 */
function formatMsToReadable(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  if (totalMinutes < 60) return `${totalMinutes}分钟`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours}小时${minutes}分钟` : `${hours}小时`
}
