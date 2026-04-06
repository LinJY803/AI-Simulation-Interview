/**
 * 面试数据模拟
 */

import type { InterviewRecord, InterviewAnalysis, InterviewMessage } from '@/types'

// 生成随机ID
const generateId = (prefix: string = 'interview') => 
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

// 生成随机时间戳（最近30天内）
const generateTimestamp = (daysAgo: number = 30) => {
  const now = Date.now()
  const dayInMs = 24 * 60 * 60 * 1000
  return now - Math.floor(Math.random() * daysAgo * dayInMs)
}

// 面试职位选项
const positions = [
  '前端开发工程师',
  '后端开发工程师',
  '全栈工程师',
  '移动端开发工程师',
  '算法工程师',
  '测试工程师',
  '产品经理',
  'UI设计师',
  '数据工程师',
  '运维工程师'
]

// 面试难度选项
const difficulties = ['easy', 'medium', 'hard'] as const

// 面试类型选项
const types = ['technical', 'behavioral', 'mixed'] as const

// 生成随机面试消息
const generateMessages = (count: number = 10): InterviewMessage[] => {
  const messages: InterviewMessage[] = []
  
  for (let i = 0; i < count; i++) {
    const isUser = i % 2 === 0
    const timestamp = Date.now() - (count - i) * 10000
    
    const userMessages = [
      '我对Vue3的Composition API很熟悉，它提供了更好的逻辑复用能力。',
      '在处理性能优化时，我会优先考虑代码拆分和懒加载。',
      'TypeScript的类型系统确实能帮助减少运行时错误。',
      '我会使用Webpack的tree shaking来减少包体积。',
      '对于状态管理，我通常使用Pinia而不是Vuex。',
      '我熟悉微前端架构，有过相关的项目经验。',
      '在团队协作中，我习惯使用Git flow工作流。',
      '我使用过Jest进行单元测试，覆盖率可以达到80%以上。',
      '对于代码规范，我们团队使用ESLint和Prettier。',
      '我了解过Serverless架构，可以降低运维成本。'
    ]
    
    const assistantMessages = [
      '可以详细说一下Composition API相比Options API的优势吗？',
      '你提到性能优化，能具体谈谈如何实施代码拆分吗？',
      'TypeScript的类型推断在实际项目中有什么挑战？',
      '除了Webpack，你还了解哪些构建工具？',
      '为什么选择Pinia而不是Vuex？有什么具体的考量吗？',
      '微前端架构在实施过程中遇到过哪些问题？',
      'Git flow在大型项目中有什么需要注意的地方？',
      '如何保证测试覆盖率的真实性？',
      '团队如何统一代码规范？有什么自动化工具吗？',
      'Serverless架构对开发流程有什么影响？'
    ]
    
    messages.push({
      id: `msg_${timestamp}_${i}`,
      content: isUser 
        ? userMessages[Math.floor(Math.random() * userMessages.length)]
        : assistantMessages[Math.floor(Math.random() * assistantMessages.length)],
      role: isUser ? 'user' : 'assistant',
      timestamp,
      sentiment: isUser ? 'positive' : 'neutral'
    })
  }
  
  return messages
}

// 生成随机面试分析
const generateAnalysis = (): InterviewAnalysis => {
  const technicalScore = 3.5 + Math.random() * 1.5
  const communicationScore = 3.0 + Math.random() * 1.8
  const problemSolvingScore = 3.2 + Math.random() * 1.6
  const overallScore = (technicalScore + communicationScore + problemSolvingScore) / 3
  
  return {
    technicalScore: parseFloat(technicalScore.toFixed(1)),
    communicationScore: parseFloat(communicationScore.toFixed(1)),
    problemSolvingScore: parseFloat(problemSolvingScore.toFixed(1)),
    overallScore: parseFloat(overallScore.toFixed(1)),
    
    strengths: [
      '技术基础扎实，对主流框架有深入理解',
      '问题分析能力较强，能够快速定位问题',
      '沟通表达清晰，逻辑思维严密',
      '学习能力强，能够快速掌握新技术'
    ],
    
    weaknesses: [
      '项目经验相对较少，需要更多实践',
      '系统设计能力有待提高',
      '对某些底层原理理解不够深入',
      '英语沟通能力需要加强'
    ],
    
    suggestions: [
      '参与更多实际项目，积累项目经验',
      '学习系统设计相关知识',
      '深入研究框架底层原理',
      '提高英语听说能力'
    ],
    
    detailedAnalysis: [
      {
        category: '技术知识',
        score: technicalScore,
        description: '对前端技术栈有较好的掌握，能够熟练使用主流框架和工具',
        examples: ['Vue3 Composition API', 'TypeScript类型系统', 'Webpack配置']
      },
      {
        category: '问题解决',
        score: problemSolvingScore,
        description: '能够分析复杂问题并提出解决方案，具备良好的逻辑思维能力',
        examples: ['性能优化方案', '架构设计决策', '代码重构思路']
      },
      {
        category: '沟通表达',
        score: communicationScore,
        description: '沟通表达清晰，能够有效传达技术观点和设计方案',
        examples: ['技术方案讲解', '团队协作沟通', '项目汇报演示']
      }
    ],
    
    responseTime: {
      average: 2000 + Math.random() * 3000,
      fastest: 1000 + Math.random() * 2000,
      slowest: 5000 + Math.random() * 5000
    },
    
    keywords: {
      technical: ['Vue3', 'TypeScript', 'Webpack', 'Node.js', '微前端'],
      behavioral: ['团队协作', '问题解决', '学习能力', '沟通表达']
    }
  }
}

// 生成单个面试记录
const generateInterview = (index: number): InterviewRecord => {
  const startTime = generateTimestamp(30)
  const duration = 30 * 60 * 1000 + Math.random() * 60 * 60 * 1000 // 30-90分钟
  const endTime = startTime + duration
  const messages = generateMessages(10 + Math.floor(Math.random() * 20))
  const analysis = generateAnalysis()
  
  return {
    id: generateId(),
    title: `${positions[index % positions.length]} 面试`,
    position: positions[index % positions.length],
    difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
    type: types[Math.floor(Math.random() * types.length)],
    startTime,
    endTime,
    duration,
    status: Math.random() > 0.2 ? 'completed' : 'ongoing',
    score: parseFloat((analysis.overallScore * 20).toFixed(1)), // 转换为百分制
    messages,
    analysis,
    metadata: {
      device: Math.random() > 0.5 ? 'Desktop' : 'Mobile',
      browser: Math.random() > 0.5 ? 'Chrome' : 'Firefox'
    }
  }
}

// 生成面试历史数据
export const generateInterviewHistory = (count: number = 20): InterviewRecord[] => {
  const interviews: InterviewRecord[] = []
  
  for (let i = 0; i < count; i++) {
    interviews.push(generateInterview(i))
  }
  
  // 按时间倒序排序
  return interviews.sort((a, b) => b.startTime - a.startTime)
}

// 获取面试统计数据
export const getInterviewStats = (interviews: InterviewRecord[]) => {
  const completed = interviews.filter(i => i.status === 'completed')
  const ongoing = interviews.filter(i => i.status === 'ongoing')
  
  const avgScore = completed.length > 0 
    ? completed.reduce((sum, i) => sum + (i.score || 0), 0) / completed.length 
    : 0
  
  const totalDuration = completed.reduce((sum, i) => sum + i.duration, 0)
  const avgDuration = completed.length > 0 ? totalDuration / completed.length : 0
  
  const byDifficulty = interviews.reduce((acc, i) => {
    acc[i.difficulty] = (acc[i.difficulty] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const byPosition = interviews.reduce((acc, i) => {
    acc[i.position] = (acc[i.position] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  // 按日期分组（最近7天）
  const byDate: Record<string, number> = {}
  const now = Date.now()
  const dayInMs = 24 * 60 * 60 * 1000
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(now - i * dayInMs)
    const dateStr = date.toISOString().split('T')[0]
    byDate[dateStr] = interviews.filter(i => {
      const interviewDate = new Date(i.startTime).toISOString().split('T')[0]
      return interviewDate === dateStr
    }).length
  }
  
  return {
    totalCount: interviews.length,
    completedCount: completed.length,
    ongoingCount: ongoing.length,
    canceledCount: interviews.filter(i => i.status === 'canceled').length,
    averageScore: parseFloat(avgScore.toFixed(1)),
    totalDuration,
    averageDuration: parseFloat(avgDuration.toFixed(0)),
    byDifficulty,
    byPosition,
    byDate
  }
}

// 获取最近完成的面试
export const getRecentInterviews = (interviews: InterviewRecord[], count: number = 5) => {
  return interviews
    .filter(i => i.status === 'completed')
    .sort((a, b) => b.endTime - a.endTime)
    .slice(0, count)
}

// 获取高分面试（top 3）
export const getTopInterviews = (interviews: InterviewRecord[], count: number = 3) => {
  return interviews
    .filter(i => i.score !== undefined)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, count)
}

// 获取指定职位的面试记录
export const getInterviewsByPosition = (interviews: InterviewRecord[], position: string) => {
  return interviews.filter(i => i.position === position)
}

// 获取指定难度的面试记录
export const getInterviewsByDifficulty = (interviews: InterviewRecord[], difficulty: string) => {
  return interviews.filter(i => i.difficulty === difficulty)
}

// 获取指定时间范围的面试记录
export const getInterviewsByDateRange = (
  interviews: InterviewRecord[],
  startDate: number,
  endDate: number
) => {
  return interviews.filter(i => i.startTime >= startDate && i.endTime <= endDate)
}

// 获取用户的趋势数据（用于图表）
export const getTrendData = (interviews: InterviewRecord[]) => {
  const completed = interviews.filter(i => i.status === 'completed')
  
  if (completed.length === 0) {
    return {
      labels: [],
      scores: [],
      durations: []
    }
  }
  
  // 按月份分组
  const monthlyData = completed.reduce((acc, i) => {
    const date = new Date(i.startTime)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        count: 0,
        totalScore: 0,
        totalDuration: 0
      }
    }
    
    acc[monthKey].count++
    acc[monthKey].totalScore += i.score || 0
    acc[monthKey].totalDuration += i.duration
    
    return acc
  }, {} as Record<string, { count: number; totalScore: number; totalDuration: number }>)
  
  const sortedMonths = Object.keys(monthlyData).sort()
  
  return {
    labels: sortedMonths,
    scores: sortedMonths.map(month => 
      parseFloat((monthlyData[month].totalScore / monthlyData[month].count).toFixed(1))
    ),
    durations: sortedMonths.map(month => 
      parseFloat((monthlyData[month].totalDuration / monthlyData[month].count / 1000 / 60).toFixed(1))
    )
  }
}

// 预生成的模拟数据
export const mockInterviews: InterviewRecord[] = generateInterviewHistory(15)

export const mockStats = getInterviewStats(mockInterviews)

export const mockRecentInterviews = getRecentInterviews(mockInterviews, 5)

export const mockTopInterviews = getTopInterviews(mockInterviews, 3)

export const mockTrendData = getTrendData(mockInterviews)

// 面试问题库（用于模拟）
export const interviewQuestions = {
  technical: {
    frontend: [
      '请解释一下Vue3的响应式原理。',
      '什么是虚拟DOM？它有什么优势？',
      '如何实现组件的懒加载？',
      '请谈谈你对TypeScript的理解。',
      '如何进行前端性能优化？',
      '什么是Webpack？它解决了什么问题？',
      '请解释一下CSS盒模型。',
      '什么是跨域问题？如何解决？',
      '请谈谈你对前端工程化的理解。',
      '什么是微前端？它有什么优势？'
    ],
    backend: [
      '请解释一下RESTful API的设计原则。',
      '什么是数据库索引？它有什么作用？',
      '如何进行系统性能优化？',
      '请谈谈你对微服务架构的理解。',
      '什么是缓存？常用的缓存策略有哪些？',
      '请解释一下事务的ACID特性。',
      '如何进行系统安全防护？',
      '什么是消息队列？它解决了什么问题？',
      '请谈谈你对DevOps的理解。',
      '什么是容器化？Docker有什么优势？'
    ]
  },
  behavioral: [
    '请描述一个你遇到的最具挑战性的项目。',
    '当你和团队成员意见不合时，你会如何处理？',
    '你如何管理多个任务和优先级？',
    '请描述一次你失败的经历以及你从中学到了什么。',
    '你如何保持自己的技术更新？',
    '请描述一个你带领团队成功的案例。',
    '你如何处理工作中的压力？',
    '你对我们公司有什么了解？为什么选择我们？',
    '你未来的职业规划是什么？',
    '你有什么问题想问我们吗？'
  ]
}

// 模拟API响应
export const mockApiResponses = {
  login: {
    code: 200,
    message: '登录成功',
    data: {
      token: 'mock_jwt_token_123456',
      user: {
        id: 1,
        username: 'test_user',
        email: 'test@example.com',
        avatar: 'https://picsum.photos/200',
        role: 'user' as const,
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
        lastLoginAt: Date.now(),
        status: 'active' as const
      }
    },
    timestamp: Date.now()
  },
  
  interviews: {
    code: 200,
    message: '获取成功',
    data: {
      items: mockInterviews,
      total: mockInterviews.length,
      page: 1,
      limit: 10,
      pages: Math.ceil(mockInterviews.length / 10)
    },
    timestamp: Date.now()
  },
  
  stats: {
    code: 200,
    message: '获取成功',
    data: mockStats,
    timestamp: Date.now()
  },
  
  analysis: {
    code: 200,
    message: '分析完成',
    data: generateAnalysis(),
    timestamp: Date.now()
  }
}

export default {
  generateInterviewHistory,
  getInterviewStats,
  getRecentInterviews,
  getTopInterviews,
  getInterviewsByPosition,
  getInterviewsByDifficulty,
  getInterviewsByDateRange,
  getTrendData,
  mockInterviews,
  mockStats,
  mockRecentInterviews,
  mockTopInterviews,
  mockTrendData,
  interviewQuestions,
  mockApiResponses
}