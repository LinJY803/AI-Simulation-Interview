import mitt from 'mitt'

type WebSocketEvents = {
  open: void
  close: void
  error: Error
  message: any
  interview_started: { interviewId: string }
  interview_ended: { interviewId: string }
  new_message: {
    interviewId: string
    message: any
    role: 'user' | 'assistant' | 'system'
  }
  audio_ready: { interviewId: string; audioUrl: string }
  analysis_ready: { interviewId: string; analysis: any }
}

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private emitter = mitt<WebSocketEvents>()

  constructor(private url: string) {}

  // 连接 WebSocket
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)
        
        this.ws.onopen = () => {
          console.log('WebSocket connected')
          this.reconnectAttempts = 0
          this.emitter.emit('open')
          resolve()
        }

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          this.emitter.emit('close')
          this.attemptReconnect()
        }

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error)
          this.emitter.emit('error', new Error('WebSocket connection error'))
          reject(error)
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  // 断开连接
  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnected')
      this.ws = null
    }
  }

  // 发送消息
  send(type: string, data: any = {}): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        type,
        timestamp: Date.now(),
        ...data
      }
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  // 开始面试
  startInterview(config: {
    position: string
    difficulty: 'easy' | 'medium' | 'hard'
    duration: number
  }): void {
    this.send('interview_start', config)
  }

  // 发送用户消息
  sendUserMessage(interviewId: string, content: string, audioData?: string): void {
    this.send('user_message', {
      interviewId,
      content,
      audioData
    })
  }

  // 结束面试
  endInterview(interviewId: string): void {
    this.send('interview_end', { interviewId })
  }

  // 订阅事件
  on<T extends keyof WebSocketEvents>(
    event: T,
    handler: (payload: WebSocketEvents[T]) => void
  ): void {
    this.emitter.on(event, handler as any)
  }

  // 取消订阅
  off<T extends keyof WebSocketEvents>(
    event: T,
    handler: (payload: WebSocketEvents[T]) => void
  ): void {
    this.emitter.off(event, handler as any)
  }

  // 处理接收到的消息
  private handleMessage(data: any): void {
    const { type, ...payload } = data

    switch (type) {
      case 'interview_started':
        this.emitter.emit('interview_started', payload)
        break
      
      case 'interview_ended':
        this.emitter.emit('interview_ended', payload)
        break
      
      case 'assistant_message':
        this.emitter.emit('new_message', {
          interviewId: payload.interviewId,
          message: payload.message,
          role: 'assistant'
        })
        break
      
      case 'audio_ready':
        this.emitter.emit('audio_ready', payload)
        break
      
      case 'analysis_ready':
        this.emitter.emit('analysis_ready', payload)
        break
      
      case 'error':
        console.error('WebSocket server error:', payload)
        break
      
      default:
        this.emitter.emit('message', data)
    }
  }

  // 尝试重连
  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error)
        })
      }, this.reconnectDelay * this.reconnectAttempts)
    }
  }

  // 获取连接状态
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // 获取重连次数
  get reconnectCount(): number {
    return this.reconnectAttempts
  }
}

// 创建 WebSocket 服务实例
const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws'
export const wsService = new WebSocketService(wsUrl)

export default wsService