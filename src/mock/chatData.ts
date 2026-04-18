/**
 * mock/chatData.ts — 对话模拟数据集
 *
 * 用于前端开发和调试，无需后端即可完整运行所有页面功能。
 * 所有数据与 `src/types/chat.ts` 中的类型定义对齐。
 */

import type { ChatMessage, ChatConversation } from '@/types/chat'

const generateId = (prefix: string = 'conversation') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

const baseMessages = (): ChatMessage[] => [
  {
    id: 'm1',
    conversationId: 'conversation_mock_1',
    role: 'assistant',
    content: '你好，我是你的智能体助手。你可以直接开始提问。',
    status: 'completed',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    timestamp: Date.now(),
    sequence: 0,
  },
  {
    id: 'm2',
    conversationId: 'conversation_mock_1',
    role: 'user',
    content: '你好，请帮我介绍一下 Vue3 的 Composition API。',
    status: 'completed',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    timestamp: Date.now(),
    sequence: 1,
  },
]

export const mockConversationDetail: ChatConversation = {
  id: generateId(),
  title: '前端技术对话',
  updatedAt: Date.now(),
  summary: '围绕前端技术栈、性能优化和工程化展开的对话。',
  messages: baseMessages(),
}

export const mockConversationList: ChatConversation[] = [
  mockConversationDetail,
  {
    id: generateId(),
    title: '系统设计对话',
    updatedAt: Date.now(),
    summary: '围绕系统设计与架构选型展开的对话。',
    messages: [],
  },
]

export const mockAnalysisList = [
  {
    technicalScore: 4.2,
    communicationScore: 4.0,
    problemSolvingScore: 4.3,
    overallScore: 4.2,
    strengths: ['表达清晰', '思路完整', '实践经验丰富'],
    weaknesses: ['可进一步强化系统设计'],
    suggestions: ['多做架构练习', '总结项目经验'],
  },
]
