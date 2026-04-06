import { defineStore } from 'pinia'

// 用户信息接口
interface UserInfo {
  id: number
  username: string
  email: string
  avatar: string
  role: string
}

// 面试消息接口
interface InterviewMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system'
  timestamp: number
  isAudio?: boolean
  audioUrl?: string
}

// 面试记录接口
interface InterviewRecord {
  id: string
  title: string
  startTime: number
  endTime: number
  duration: number
  status: 'ongoing' | 'completed' | 'canceled'
  score?: number
  messages: InterviewMessage[]
  analysis?: InterviewAnalysis
}

// 面试分析接口
interface InterviewAnalysis {
  technicalScore: number
  communicationScore: number
  problemSolvingScore: number
  overallScore: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
}

export const useUserStore = defineStore('user', {
  state: () => ({
    userInfo: null as UserInfo | null,
    token: localStorage.getItem('token') || '',
    isLoggedIn: !!localStorage.getItem('token')
  }),
  actions: {
    setUserInfo(info: UserInfo) {
      this.userInfo = info
    },
    setToken(token: string) {
      this.token = token
      this.isLoggedIn = true
      localStorage.setItem('token', token)
    },
    logout() {
      this.userInfo = null
      this.token = ''
      this.isLoggedIn = false
      localStorage.removeItem('token')
    }
  }
})

export const useInterviewStore = defineStore('interview', {
  state: () => ({
    currentInterview: null as InterviewRecord | null,
    interviewHistory: [] as InterviewRecord[],
    isInterviewing: false,
    isRecording: false,
    audioBlob: null as Blob | null
  }),
  actions: {
    startNewInterview(title: string = '新面试') {
      this.currentInterview = {
        id: `interview_${Date.now()}`,
        title,
        startTime: Date.now(),
        endTime: 0,
        duration: 0,
        status: 'ongoing',
        messages: []
      }
      this.isInterviewing = true
    },
    addMessage(message: InterviewMessage) {
      if (this.currentInterview) {
        this.currentInterview.messages.push(message)
      }
    },
    endInterview(analysis?: InterviewAnalysis) {
      if (this.currentInterview) {
        this.currentInterview.endTime = Date.now()
        this.currentInterview.duration = this.currentInterview.endTime - this.currentInterview.startTime
        this.currentInterview.status = 'completed'
        this.currentInterview.analysis = analysis
        
        this.interviewHistory.unshift(this.currentInterview)
        this.currentInterview = null
        this.isInterviewing = false
      }
    },
    setRecording(isRecording: boolean) {
      this.isRecording = isRecording
    },
    setAudioBlob(blob: Blob) {
      this.audioBlob = blob
    },
    clearAudioBlob() {
      this.audioBlob = null
    }
  },
  getters: {
    getInterviewById: (state) => (id: string) => {
      return state.interviewHistory.find(interview => interview.id === id)
    },
    getRecentInterviews: (state) => (count: number = 5) => {
      return state.interviewHistory.slice(0, count)
    },
    getInterviewStats: (state) => {
      const completed = state.interviewHistory.filter(i => i.status === 'completed')
      const avgScore = completed.length > 0 
        ? completed.reduce((sum, i) => sum + (i.score || 0), 0) / completed.length 
        : 0
      const totalDuration = completed.reduce((sum, i) => sum + i.duration, 0)
      
      return {
        totalCount: state.interviewHistory.length,
        completedCount: completed.length,
        averageScore: avgScore,
        totalDuration
      }
    }
  }
})