/**
 * AI 面试系统类型定义
 */

// 用户相关类型
export interface User {
  id: number
  username: string
  email: string
  avatar: string
  role: 'admin' | 'user'
  createdAt: number
  lastLoginAt: number
  status: 'active' | 'inactive' | 'banned'
}

export interface LoginRequest {
  username: string
  password: string
  remember?: boolean
}

export interface LoginResponse {
  token: string
  user: User
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  confirmPassword: string
}

// 面试消息类型
export interface InterviewMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: number
  isAudio?: boolean
  audioUrl?: string
  audioDuration?: number
  sentiment?: 'positive' | 'neutral' | 'negative'
  analysis?: {
    type: 'strength' | 'weakness' | 'suggestion'
    content: string
  }
}

// 面试分析结果类型
export interface InterviewAnalysis {
  // 分数
  technicalScore: number
  communicationScore: number
  problemSolvingScore: number
  overallScore: number
  
  // 分析内容
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  
  // 详细分析
  detailedAnalysis: {
    category: string
    score: number
    description: string
    examples: string[]
  }[]
  
  // 时间分析
  responseTime: {
    average: number
    fastest: number
    slowest: number
  }
  
  // 关键词分析
  keywords: {
    technical: string[]
    behavioral: string[]
  }
}

// 面试记录类型
export interface InterviewRecord {
  id: string
  title: string
  position: string
  difficulty: 'easy' | 'medium' | 'hard'
  type: 'technical' | 'behavioral' | 'mixed'
  startTime: number
  endTime: number
  duration: number
  status: 'ongoing' | 'completed' | 'canceled'
  score?: number
  messages: InterviewMessage[]
  analysis?: InterviewAnalysis
  metadata?: {
    device: string
    browser: string
    ip?: string
  }
}

// 面试配置类型
export interface InterviewConfig {
  position: string
  difficulty: 'easy' | 'medium' | 'hard'
  duration: number
  type: 'technical' | 'behavioral' | 'mixed'
  language: 'zh-CN' | 'en-US'
  voiceEnabled: boolean
  topics?: string[]
}

// API 响应类型
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp: number
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

// WebSocket 消息类型
export interface WebSocketMessage {
  type: string
  timestamp: number
  data: any
  interviewId?: string
  userId?: number
}

// SSE 事件类型
export interface SSEEvent {
  type: string
  data: any
  id?: string
}

// 音频相关类型
export interface AudioRecording {
  id: string
  blob: Blob
  duration: number
  format: string
  size: number
  transcribed?: boolean
  transcription?: string
}

export interface AudioPlayback {
  id: string
  url: string
  isPlaying: boolean
  currentTime: number
  duration: number
}

// 可视化图表数据类型
export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor: string[]
    borderColor: string[]
    borderWidth: number
  }[]
}

export interface RadarChartData {
  indicator: { name: string; max: number }[]
  series: {
    name: string
    value: number[]
    color: string
  }[]
}

export interface ProgressData {
  label: string
  value: number
  max: number
  color: string
}

// 统计数据类型
export interface InterviewStats {
  totalCount: number
  completedCount: number
  ongoingCount: number
  canceledCount: number
  averageScore: number
  totalDuration: number
  averageDuration: number
  byDifficulty: Record<string, number>
  byPosition: Record<string, number>
  byDate: Record<string, number>
}

export interface UserStats {
  totalInterviews: number
  completedInterviews: number
  averageScore: number
  bestScore: number
  worstScore: number
  totalDuration: number
  dailyAverage: number
  improvementRate: number
}

// 权限相关类型
export interface Permission {
  id: string
  name: string
  description: string
}

export interface Role {
  id: string
  name: string
  permissions: Permission[]
}

// 设置相关类型
export interface UserSettings {
  theme: 'light' | 'dark' | 'auto'
  language: 'zh-CN' | 'en-US'
  notifications: {
    email: boolean
    push: boolean
    sound: boolean
  }
  privacy: {
    showProfile: boolean
    showScores: boolean
    allowAnalytics: boolean
  }
  audio: {
    inputDevice: string
    outputDevice: string
    volume: number
    sampleRate: number
  }
}

// 文件上传类型
export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedAt: number
}

// 通知类型
export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  timestamp: number
  read: boolean
  action?: {
    label: string
    url: string
  }
}

// 搜索类型
export interface SearchCriteria {
  query?: string
  position?: string
  difficulty?: string
  status?: string
  dateRange?: {
    start: number
    end: number
  }
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// 导出类型
export interface ExportOptions {
  format: 'pdf' | 'html' | 'csv' | 'excel'
  includeCharts: boolean
  includeMessages: boolean
  includeAnalysis: boolean
  watermark: boolean
}

// 错误类型
export interface ApiError {
  code: number
  message: string
  details?: any
  timestamp: number
}

// 事件总线事件类型
export type AppEvents = {
  'user:login': User
  'user:logout': void
  'interview:start': InterviewRecord
  'interview:end': InterviewRecord
  'interview:message': InterviewMessage
  'interview:analysis': InterviewAnalysis
  'audio:start': void
  'audio:stop': AudioRecording
  'notification:new': Notification
  'settings:update': Partial<UserSettings>
  'error:occurred': ApiError
}

// 组件 Props 类型
export interface ComponentProps {
  // 通用 props
  className?: string
  style?: Record<string, string | number>
  id?: string
  
  // 面试组件 props
  interview?: InterviewRecord
  config?: InterviewConfig
  
  // 图表组件 props
  chartData?: ChartData | RadarChartData
  chartOptions?: Record<string, any>
  
  // 表单组件 props
  formData?: Record<string, any>
  formRules?: Record<string, any>
  
  // 列表组件 props
  items?: any[]
  loading?: boolean
  pagination?: {
    page: number
    limit: number
    total: number
  }
}

// 组件 Emits 类型
export interface ComponentEmits {
  (event: 'update:modelValue', value: any): void
  (event: 'submit', data: any): void
  (event: 'cancel'): void
  (event: 'select', item: any): void
  (event: 'delete', id: string): void
  (event: 'error', error: Error): void
}

// 泛型工具类型
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type PromiseResult<T> = Promise<ApiResponse<T>>
export type Callback<T = void> = (result: T) => void