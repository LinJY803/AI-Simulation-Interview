import { defineStore } from 'pinia'

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  timestamp: number
  isAudio?: boolean
  audioUrl?: string
}

export interface ChatAnalysis {
  technicalScore: number
  communicationScore: number
  problemSolvingScore: number
  overallScore: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
}

export interface ChatSession {
  id: string
  title: string
  startTime: number
  endTime: number
  duration: number
  status: 'ongoing' | 'completed' | 'canceled'
  score?: number
  messages: ChatMessage[]
  analysis?: ChatAnalysis
}

export const useConversationStore = defineStore('conversation', {
  state: () => ({
    currentConversation: null as ChatSession | null,
    conversationHistory: [] as ChatSession[],
    isChatting: false,
    isRecording: false,
    audioBlob: null as Blob | null,
    elapsedSeconds: 0,
  }),
  actions: {
    startNewChat(title: string = '新对话') {
      this.currentConversation = {
        id: `conversation_${Date.now()}`,
        title,
        startTime: Date.now(),
        endTime: 0,
        duration: 0,
        status: 'ongoing',
        messages: [],
      }
      this.isChatting = true
      this.elapsedSeconds = 0
    },
    addMessage(message: ChatMessage) {
      this.currentConversation?.messages.push(message)
    },
    updateLastMessageContent(content: string) {
      const messages = this.currentConversation?.messages
      const last = messages && messages.length > 0 ? messages[messages.length - 1] : undefined
      if (last) last.content = content
    },
    endChat(analysis?: ChatAnalysis) {
      if (!this.currentConversation) return
      const now = Date.now()
      this.currentConversation.endTime = now
      this.currentConversation.duration = now - this.currentConversation.startTime
      this.currentConversation.status = 'completed'
      this.currentConversation.analysis = analysis
      this.currentConversation.score = analysis?.overallScore || 0
      this.conversationHistory.unshift(this.currentConversation)
      this.currentConversation = null
      this.isChatting = false
    },
    cancelChat() {
      if (!this.currentConversation) return
      const now = Date.now()
      this.currentConversation.endTime = now
      this.currentConversation.duration = now - this.currentConversation.startTime
      this.currentConversation.status = 'canceled'
      this.conversationHistory.unshift(this.currentConversation)
      this.currentConversation = null
      this.isChatting = false
    },
  },
  getters: {
    currentMessages: (state): ChatMessage[] => state.currentConversation?.messages || [],
    messageCount: (state): number => state.currentConversation?.messages.length || 0,
    getConversationById: (state) => (id: string) => state.conversationHistory.find(i => i.id === id),
    getRecentChats: (state) => (count = 5) => state.conversationHistory.slice(0, count),
  },
})
