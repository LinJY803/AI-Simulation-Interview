/**
 * AI 面试系统工具函数集合
 */

/**
 * 格式化日期时间
 * @param timestamp 时间戳
 * @param format 格式字符串
 * @returns 格式化后的时间字符串
 */
export function formatDateTime(
  timestamp: number,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string {
  const date = new Date(timestamp)
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)
}

/**
 * 格式化时长
 * @param ms 毫秒数
 * @returns 格式化后的时长字符串
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}小时${minutes % 60}分${seconds % 60}秒`
  }
  if (minutes > 0) {
    return `${minutes}分${seconds % 60}秒`
  }
  return `${seconds}秒`
}

/**
 * 格式化时长（简洁版）
 * @param ms 毫秒数
 * @returns 简洁格式的时长字符串
 */
export function formatDurationShort(ms: number): string {
  const minutes = Math.floor(ms / 1000 / 60)
  const seconds = Math.floor((ms / 1000) % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * 计算分数等级
 * @param score 分数（0-5）
 * @returns 等级描述
 */
export function getScoreLevel(score: number): {
  level: string
  color: string
  description: string
} {
  if (score >= 4.5) {
    return {
      level: '优秀',
      color: '#67c23a',
      description: '表现非常出色'
    }
  }
  if (score >= 4.0) {
    return {
      level: '良好',
      color: '#409eff',
      description: '表现良好'
    }
  }
  if (score >= 3.0) {
    return {
      level: '一般',
      color: '#e6a23c',
      description: '有改进空间'
    }
  }
  if (score >= 2.0) {
    return {
      level: '较差',
      color: '#f56c6c',
      description: '需要加强'
    }
  }
  return {
    level: '待提升',
    color: '#909399',
    description: '需要大幅提升'
  }
}

/**
 * 根据分数获取颜色
 * @param score 分数
 * @returns 颜色值
 */
export function getScoreColor(score: number): string {
  if (score >= 4) return '#67c23a'
  if (score >= 3) return '#e6a23c'
  if (score >= 2) return '#f56c6c'
  return '#909399'
}

/**
 * 防抖函数
 * @param fn 原函数
 * @param delay 延迟时间
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  
  return function (...args: Parameters<T>) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

/**
 * 节流函数
 * @param fn 原函数
 * @param interval 时间间隔
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastTime = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  
  return function (...args: Parameters<T>) {
    const now = Date.now()
    
    if (now - lastTime >= interval) {
      fn(...args)
      lastTime = now
    } else {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        fn(...args)
        lastTime = Date.now()
      }, interval - (now - lastTime))
    }
  }
}

/**
 * 深拷贝对象
 * @param obj 要拷贝的对象
 * @returns 深拷贝后的对象
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any
  }
  
  if (obj instanceof Array) {
    const arr: any[] = []
    for (let i = 0; i < obj.length; i++) {
      arr[i] = deepClone(obj[i])
    }
    return arr as any
  }
  
  if (typeof obj === 'object') {
    const clonedObj: any = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  
  return obj
}

/**
 * 生成唯一ID
 * @param prefix 前缀
 * @returns 唯一ID字符串
 */
export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 9)
  return `${prefix}_${timestamp}_${random}`
}

/**
 * 验证邮箱格式
 * @param email 邮箱地址
 * @returns 是否有效
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 验证密码强度
 * @param password 密码
 * @returns 强度等级和描述
 */
export function checkPasswordStrength(password: string): {
  level: number
  message: string
  color: string
} {
  let level = 0
  
  if (password.length >= 8) level++
  if (/[A-Z]/.test(password)) level++
  if (/[a-z]/.test(password)) level++
  if (/[0-9]/.test(password)) level++
  if (/[^A-Za-z0-9]/.test(password)) level++
  
  const messages = ['弱', '较弱', '中等', '较强', '强']
  const colors = ['#f56c6c', '#e6a23c', '#409eff', '#67c23a', '#67c23a']
  
  return {
    level: Math.min(level, 4),
    message: messages[Math.min(level, 4)],
    color: colors[Math.min(level, 4)]
  }
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 下载文件
 * @param content 文件内容
 * @param filename 文件名
 * @param type 文件类型
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  type: string = 'text/plain'
): void {
  let blob: Blob
  
  if (typeof content === 'string') {
    blob = new Blob([content], { type })
  } else {
    blob = content
  }
  
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 复制文本到剪贴板
 * @param text 要复制的文本
 * @returns Promise<boolean>
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
      return true
    }
  } catch (error) {
    console.error('复制失败:', error)
    return false
  }
}

/**
 * 生成随机颜色
 * @returns 随机颜色
 */
export function getRandomColor(): string {
  const colors = [
    '#667eea', '#764ba2', '#f56565', '#ed8936', '#ecc94b',
    '#48bb78', '#38b2ac', '#4299e1', '#9f7aea', '#ed64a6'
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * 数组去重
 * @param array 数组
 * @param key 对象键名（可选）
 * @returns 去重后的数组
 */
export function uniqueArray<T>(array: T[], key?: keyof T): T[] {
  if (!key) {
    return [...new Set(array)]
  }
  
  const seen = new Set()
  return array.filter(item => {
    const value = item[key]
    if (seen.has(value)) {
      return false
    }
    seen.add(value)
    return true
  })
}

/**
 * 数字格式化
 * @param num 数字
 * @param decimals 小数位数
 * @returns 格式化后的数字字符串
 */
export function formatNumber(num: number, decimals: number = 2): string {
  if (isNaN(num)) return '0'
  
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

/**
 * 获取URL参数
 * @param name 参数名
 * @returns 参数值
 */
export function getUrlParam(name: string): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get(name)
}

/**
 * 设置URL参数
 * @param name 参数名
 * @param value 参数值
 */
export function setUrlParam(name: string, value: string): void {
  const url = new URL(window.location.href)
  url.searchParams.set(name, value)
  window.history.replaceState({}, '', url.toString())
}

/**
 * 删除URL参数
 * @param name 参数名
 */
export function removeUrlParam(name: string): void {
  const url = new URL(window.location.href)
  url.searchParams.delete(name)
  window.history.replaceState({}, '', url.toString())
}

/**
 * 等待指定的时间
 * @param ms 毫秒数
 * @returns Promise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 检测设备类型
 * @returns 设备类型
 */
export function detectDevice(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth
  if (width <= 768) return 'mobile'
  if (width <= 1024) return 'tablet'
  return 'desktop'
}

/**
 * 检测浏览器类型
 * @returns 浏览器类型
 */
export function detectBrowser(): string {
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes('chrome')) return 'Chrome'
  if (userAgent.includes('firefox')) return 'Firefox'
  if (userAgent.includes('safari')) return 'Safari'
  if (userAgent.includes('edge')) return 'Edge'
  return 'Unknown'
}