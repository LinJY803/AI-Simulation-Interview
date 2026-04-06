/**
 * 应用配置文件
 */

// 环境变量配置
const env = {
  // API 基础地址
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  
  // WebSocket 地址
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws',
  
  // SSE 地址
  sseUrl: import.meta.env.VITE_SSE_URL || 'http://localhost:3000/sse',
  
  // OpenAI API Key（生产环境应该从后端获取）
  openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
  
  // 应用标题
  appTitle: import.meta.env.VITE_APP_TITLE || 'AI 面试系统',
  
  // 是否启用调试模式
  debug: import.meta.env.DEV || false,
  
  // 版本号
  version: import.meta.env.VITE_APP_VERSION || '1.0.0'
}

// 应用配置
export const appConfig = {
  // 应用信息
  name: 'AI Interview System',
  description: '基于人工智能的智能面试平台',
  version: env.version,
  
  // API 配置
  api: {
    baseUrl: env.apiBaseUrl,
    timeout: 10000,
    retryCount: 3,
    retryDelay: 1000
  },
  
  // WebSocket 配置
  websocket: {
    url: env.wsUrl,
    reconnectDelay: 1000,
    maxReconnectAttempts: 5,
    pingInterval: 30000,
    pingTimeout: 5000
  },
  
  // SSE 配置
  sse: {
    url: env.sseUrl,
    reconnectDelay: 5000
  },
  
  // OpenAI 配置
  openai: {
    apiKey: env.openaiApiKey,
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 2000
  },
  
  // 面试配置
  interview: {
    // 默认面试时长（分钟）
    defaultDuration: 30,
    
    // 难度选项
    difficulties: [
      { value: 'easy', label: '简单', color: '#67c23a' },
      { value: 'medium', label: '中等', color: '#e6a23c' },
      { value: 'hard', label: '困难', color: '#f56c6c' }
    ],
    
    // 职位选项
    positions: [
      { value: 'frontend', label: '前端开发工程师' },
      { value: 'backend', label: '后端开发工程师' },
      { value: 'fullstack', label: '全栈工程师' },
      { value: 'mobile', label: '移动端开发工程师' },
      { value: 'algorithm', label: '算法工程师' },
      { value: 'qa', label: '测试工程师' },
      { value: 'pm', label: '产品经理' },
      { value: 'designer', label: 'UI设计师' },
      { value: 'data', label: '数据工程师' },
      { value: 'ops', label: '运维工程师' }
    ],
    
    // 面试类型
    types: [
      { value: 'technical', label: '技术面试' },
      { value: 'behavioral', label: '行为面试' },
      { value: 'mixed', label: '综合面试' }
    ],
    
    // 语言选项
    languages: [
      { value: 'zh-CN', label: '中文' },
      { value: 'en-US', label: '英文' }
    ],
    
    // 最大消息数量
    maxMessages: 50,
    
    // 最大录音时长（秒）
    maxRecordingDuration: 300
  },
  
  // 音频配置
  audio: {
    // 支持的音频格式
    supportedFormats: ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg'],
    
    // 默认采样率
    sampleRate: 16000,
    
    // 最大音频文件大小（MB）
    maxFileSize: 50,
    
    // 录音配置
    recording: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 16000
    }
  },
  
  // 评分配置
  scoring: {
    // 分数范围
    minScore: 0,
    maxScore: 5,
    
    // 分数等级
    levels: [
      { min: 4.5, level: '优秀', color: '#67c23a', icon: 'Star' },
      { min: 4.0, level: '良好', color: '#409eff', icon: 'StarHalf' },
      { min: 3.0, level: '一般', color: '#e6a23c', icon: 'Star' },
      { min: 2.0, level: '较差', color: '#f56c6c', icon: 'Star' },
      { min: 0, level: '待提升', color: '#909399', icon: 'Star' }
    ],
    
    // 各项权重
    weights: {
      technical: 0.4,
      communication: 0.3,
      problemSolving: 0.3
    }
  },
  
  // 图表配置
  charts: {
    // 颜色方案
    colors: [
      '#667eea', '#764ba2', '#f56565', '#ed8936', '#ecc94b',
      '#48bb78', '#38b2ac', '#4299e1', '#9f7aea', '#ed64a6'
    ],
    
    // 渐变颜色
    gradients: [
      ['#667eea', '#764ba2'],
      ['#f56565', '#ed8936'],
      ['#48bb78', '#38b2ac'],
      ['#4299e1', '#9f7aea'],
      ['#ecc94b', '#ed64a6']
    ],
    
    // 图表配置
    radar: {
      indicatorCount: 6,
      maxValue: 5
    },
    
    pie: {
      innerRadius: '40%',
      outerRadius: '70%'
    },
    
    line: {
      smooth: true,
      showSymbol: true,
      symbolSize: 6
    },
    
    bar: {
      barWidth: '60%'
    }
  },
  
  // 主题配置
  theme: {
    // 主题色
    colors: {
      primary: '#667eea',
      secondary: '#764ba2',
      success: '#67c23a',
      warning: '#e6a23c',
      danger: '#f56c6c',
      info: '#909399',
      background: '#f5f7fa',
      card: '#ffffff',
      border: '#ebeef5'
    },
    
    // 渐变背景
    gradients: {
      primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      secondary: 'linear-gradient(135deg, #f56565 0%, #ed8936 100%)',
      success: 'linear-gradient(135deg, #48bb78 0%, #38b2ac 100%)'
    },
    
    // 阴影
    shadows: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.12)',
      md: '0 4px 6px rgba(0, 0, 0, 0.12)',
      lg: '0 10px 15px rgba(0, 0, 0, 0.12)',
      xl: '0 20px 25px rgba(0, 0, 0, 0.12)'
    },
    
    // 圆角
    borderRadius: {
      sm: '4px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      full: '9999px'
    }
  },
  
  // 路由配置
  routes: {
    // 需要登录的路由
    authRoutes: ['/dashboard', '/dashboard/*', '/interview', '/history', '/profile'],
    
    // 公开路由
    publicRoutes: ['/login', '/register', '/forgot-password'],
    
    // 重定向路由
    redirects: {
      '/': '/dashboard',
      '/dashboard': '/dashboard/interview'
    }
  },
  
  // 存储配置
  storage: {
    // localStorage 键名
    keys: {
      token: 'ai_interview_token',
      user: 'ai_interview_user',
      theme: 'ai_interview_theme',
      settings: 'ai_interview_settings',
      history: 'ai_interview_history'
    },
    
    // 数据过期时间（毫秒）
    expiration: {
      token: 7 * 24 * 60 * 60 * 1000, // 7天
      history: 30 * 24 * 60 * 60 * 1000 // 30天
    }
  },
  
  // 通知配置
  notifications: {
    // 显示时长（毫秒）
    duration: {
      success: 3000,
      warning: 4000,
      error: 5000,
      info: 3000
    },
    
    // 位置
    position: 'top-right',
    
    // 最大数量
    maxCount: 5
  },
  
  // 分页配置
  pagination: {
    // 每页显示数量选项
    pageSizes: [10, 20, 50, 100],
    
    // 默认每页显示数量
    defaultPageSize: 10,
    
    // 默认页码
    defaultPage: 1
  },
  
  // 调试配置
  debug: env.debug,
  
  // 开发工具配置
  devTools: {
    // 是否启用 mock 数据
    enableMock: env.debug,
    
    // 是否启用性能监控
    enablePerformance: env.debug,
    
    // 是否启用错误边界
    enableErrorBoundary: true,
    
    // 是否启用路由守卫日志
    enableRouteGuardLogs: env.debug
  },
  
  // 性能监控配置
  performance: {
    // 是否启用性能监控
    enabled: env.debug,
    
    // 采样率
    sampleRate: 0.1,
    
    // 报告阈值（毫秒）
    thresholds: {
      pageLoad: 2000,
      apiRequest: 1000,
      render: 100
    }
  },
  
  // 错误监控配置
  errorMonitoring: {
    // 是否启用错误监控
    enabled: true,
    
    // 错误上报地址
    endpoint: `${env.apiBaseUrl}/errors`,
    
    // 采样率
    sampleRate: 1,
    
    // 忽略的错误类型
    ignoreErrors: ['ResizeObserver', 'Script error.']
  },
  
  // 国际化配置
  i18n: {
    // 支持的语言
    languages: [
      { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
      { code: 'en-US', name: 'English', flag: '🇺🇸' }
    ],
    
    // 默认语言
    defaultLanguage: 'zh-CN',
    
    // 语言包路径
    messagesPath: '/locales'
  },
  
  // 导出配置
  export: {
    // 支持导出的格式
    formats: ['pdf', 'html', 'csv', 'excel'],
    
    // 默认导出格式
    defaultFormat: 'pdf',
    
    // 文件名模板
    filenameTemplate: 'AI面试报告_{date}_{time}',
    
    // 导出选项
    options: {
      includeCharts: true,
      includeMessages: true,
      includeAnalysis: true,
      watermark: true,
      pageSize: 'A4',
      orientation: 'portrait'
    }
  },
  
  // 安全配置
  security: {
    // 密码强度要求
    passwordStrength: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false
    },
    
    // 会话管理
    session: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      refreshThreshold: 30 * 60 * 1000 // 30分钟
    },
    
    // 请求限流
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15分钟
      maxRequests: 100
    }
  }
}

// 导出默认配置
export default appConfig