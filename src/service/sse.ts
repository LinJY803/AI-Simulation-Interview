import { EventSourcePolyfill } from 'event-source-polyfill'

type SSEMessage = {
  type: string
  data: any
  id?: string
}

type SSEOptions = {
  headers?: Record<string, string>
  withCredentials?: boolean
}

class SSEService {
  private eventSource: EventSource | EventSourcePolyfill | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()
  private url: string

  constructor(url: string) {
    this.url = url
  }

  // 连接 SSE
  connect(options: SSEOptions = {}): void {
    if (this.eventSource) {
      this.disconnect()
    }

    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      ...options.headers
    }

    // 获取 token
    const token = localStorage.getItem('token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    // 使用 EventSourcePolyfill 支持更多功能
    if (typeof EventSourcePolyfill !== 'undefined') {
      this.eventSource = new EventSourcePolyfill(this.url, {
        headers,
        withCredentials: options.withCredentials || false
      })
    } else {
      this.eventSource = new EventSource(this.url)
    }

    this.setupEventListeners()
  }

  // 断开连接
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.listeners.clear()
  }

  // 订阅事件
  subscribe(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  // 取消订阅
  unsubscribe(event: string, callback: (data: any) => void): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback)
    }
  }

  // 设置事件监听器
  private setupEventListeners(): void {
    if (!this.eventSource) return

    // 监听 open 事件
    this.eventSource.onopen = () => {
      console.log('SSE connection opened')
      this.emit('open', null)
    }

    // 监听 error 事件
    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      this.emit('error', error)
    }

    // 监听消息事件
    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleMessage(data)
      } catch (error) {
        console.error('Failed to parse SSE message:', error, event.data)
      }
    }

    // 监听自定义事件
    this.eventSource.addEventListener('interview_update', (event: any) => {
      try {
        const data = JSON.parse(event.data)
        this.emit('interview_update', data)
      } catch (error) {
        console.error('Failed to parse interview_update:', error)
      }
    })

    this.eventSource.addEventListener('chat_message', (event: any) => {
      try {
        const data = JSON.parse(event.data)
        this.emit('chat_message', data)
      } catch (error) {
        console.error('Failed to parse chat_message:', error)
      }
    })

    this.eventSource.addEventListener('audio_ready', (event: any) => {
      try {
        const data = JSON.parse(event.data)
        this.emit('audio_ready', data)
      } catch (error) {
        console.error('Failed to parse audio_ready:', error)
      }
    })

    this.eventSource.addEventListener('analysis_progress', (event: any) => {
      try {
        const data = JSON.parse(event.data)
        this.emit('analysis_progress', data)
      } catch (error) {
        console.error('Failed to parse analysis_progress:', error)
      }
    })

    this.eventSource.addEventListener('interview_completed', (event: any) => {
      try {
        const data = JSON.parse(event.data)
        this.emit('interview_completed', data)
      } catch (error) {
        console.error('Failed to parse interview_completed:', error)
      }
    })
  }

  // 处理消息
  private handleMessage(data: SSEMessage): void {
    const { type, data: messageData } = data
    
    switch (type) {
      case 'ping':
        // 心跳包，保持连接活跃
        this.emit('ping', messageData)
        break
      
      case 'connection_established':
        this.emit('connection_established', messageData)
        break
      
      case 'error':
        this.emit('error', messageData)
        break
      
      default:
        this.emit(type, messageData)
    }
  }

  // 触发事件
  private emit(event: string, data: any): void {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Error in SSE listener for event "${event}":`, error)
        }
      })
    }
  }

  // 获取连接状态
  get isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN
  }

  // 获取连接 URL
  get connectionUrl(): string {
    return this.url
  }
}

// 创建 SSE 服务实例
const sseUrl = import.meta.env.VITE_SSE_URL || 'http://localhost:3000/sse'
export const sseService = new SSEService(sseUrl)

export default sseService