import axios from 'axios'
import type { InterviewAnalysis, InterviewMessage } from '@/store'

// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

// API 接口定义
export const api = {
  // 用户相关
  auth: {
    login: (username: string, password: string) => 
      request.post('/auth/login', { username, password }),
    register: (data: any) => 
      request.post('/auth/register', data),
    logout: () => 
      request.post('/auth/logout'),
    getUserInfo: () => 
      request.get('/auth/userinfo')
  },

  // 面试相关
  interview: {
    // 开始新的面试
    startInterview: (config: {
      position: string
      difficulty: 'easy' | 'medium' | 'hard'
      duration: number
    }) => request.post('/interview/start', config),

    // 发送消息（支持文本和语音）
    sendMessage: (interviewId: string, content: string, audioData?: string) => 
      request.post(`/interview/${interviewId}/message`, { content, audioData }),

    // 结束面试并获取分析
    endInterview: (interviewId: string) => 
      request.post(`/interview/${interviewId}/end`),

    // 获取面试历史
    getInterviewHistory: (page: number = 1, limit: number = 10) => 
      request.get('/interview/history', { params: { page, limit } }),

    // 获取面试详情
    getInterviewDetail: (interviewId: string) => 
      request.get(`/interview/${interviewId}`),

    // 删除面试记录
    deleteInterview: (interviewId: string) => 
      request.delete(`/interview/${interviewId}`)
  },

  // GPT API 相关
  gpt: {
    // 流式响应（SSE）
    streamChat: (messages: Array<{role: string, content: string}>) => 
      request.post('/gpt/stream', { messages }, {
        responseType: 'stream'
      }),

    // 语音转文本
    speechToText: (audioBlob: Blob) => {
      const formData = new FormData()
      formData.append('audio', audioBlob)
      return request.post('/gpt/speech-to-text', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    },

    // 文本转语音
    textToSpeech: (text: string, voice: string = 'alloy') => 
      request.post('/gpt/text-to-speech', { text, voice }, {
        responseType: 'blob'
      }),

    // 获取面试分析
    getInterviewAnalysis: (interviewId: string) => 
      request.get(`/gpt/analysis/${interviewId}`)
  },

  // 文件上传
  upload: {
    uploadResume: (file: File) => {
      const formData = new FormData()
      formData.append('resume', file)
      return request.post('/upload/resume', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    },

    uploadAudio: (file: File) => {
      const formData = new FormData()
      formData.append('audio', file)
      return request.post('/upload/audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    }
  }
}

export default request