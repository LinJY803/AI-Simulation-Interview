// 音频录制和播放服务
class AudioService {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private source: MediaStreamAudioSourceNode | null = null
  private stream: MediaStream | null = null

  constructor() {
    // 检查浏览器是否支持 Web Audio API
    if (!window.AudioContext && !(window as any).webkitAudioContext) {
      console.warn('Web Audio API is not supported in this browser')
    }
  }

  // 请求麦克风权限并开始录音
  async startRecording(): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
      try {
        // 请求麦克风权限
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })

        // 创建音频上下文和分析器（用于可视化）
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        this.source = this.audioContext.createMediaStreamSource(this.stream)
        this.analyser = this.audioContext.createAnalyser()
        
        this.analyser.fftSize = 2048
        this.source.connect(this.analyser)

        // 创建 MediaRecorder
        this.mediaRecorder = new MediaRecorder(this.stream, {
          mimeType: 'audio/webm;codecs=opus'
        })

        this.audioChunks = []

        // 处理录音数据
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data)
          }
        }

        // 录音结束
        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
          resolve(audioBlob)
          this.cleanup()
        }

        // 开始录音
        this.mediaRecorder.start()
        
      } catch (error) {
        reject(error)
        this.cleanup()
      }
    })
  }

  // 停止录音
  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
  }

  // 播放音频
  async playAudio(audioBlob: Blob): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          resolve()
        }

        audio.onerror = (error) => {
          URL.revokeObjectURL(audioUrl)
          reject(error)
        }

        audio.play()
      } catch (error) {
        reject(error)
      }
    })
  }

  // 获取音频波形数据（用于可视化）
  getWaveformData(): Uint8Array | null {
    if (!this.analyser) return null
    
    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    this.analyser.getByteTimeDomainData(dataArray)
    
    return dataArray
  }

  // 获取音频频率数据（用于频谱可视化）
  getFrequencyData(): Uint8Array | null {
    if (!this.analyser) return null
    
    const bufferLength = this.analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    this.analyser.getByteFrequencyData(dataArray)
    
    return dataArray
  }

  // 清理资源
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
      this.stream = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.analyser = null
    this.source = null
    this.mediaRecorder = null
    this.audioChunks = []
  }

  // 检查浏览器是否支持音频录制
  static isRecordingSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && MediaRecorder)
  }

  // 获取支持的音频格式
  static getSupportedMimeTypes(): string[] {
    const types = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg'
    ]

    return types.filter(type => {
      return MediaRecorder.isTypeSupported(type)
    })
  }

  // 音频文件转换为 Base64
  static async audioToBase64(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onloadend = () => {
        if (reader.result) {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64)
        } else {
          reject(new Error('Failed to read audio file'))
        }
      }
      
      reader.onerror = () => {
        reject(new Error('Error reading audio file'))
      }
      
      reader.readAsDataURL(audioBlob)
    })
  }

  // Base64 转换为音频 Blob
  static base64ToAudio(base64: string, mimeType: string = 'audio/webm'): Blob {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    return new Blob([bytes], { type: mimeType })
  }
}

// 创建音频服务实例
export const audioService = new AudioService()

export default audioService