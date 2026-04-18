<template>
  <div class="report-container">
    <!-- 报告头部 -->
    <div class="report-header">
      <div class="header-content">
        <el-button @click="router.back()" class="back-button">
          <el-icon><ArrowLeft /></el-icon>
          {{ t('back') }}
        </el-button>
        <div class="header-info">
          <h2>{{ t('reportTitle') }}</h2>
          <div class="report-meta">
            <span class="meta-item">
              <el-icon><Calendar /></el-icon>
              {{ formatDate(conversation.startTime) }}
            </span>
            <span class="meta-item">
              <el-icon><Timer /></el-icon>
              {{ formatDuration(conversation.duration) }}
            </span>
            <span class="meta-item">
              <el-icon><ChatLineSquare /></el-icon>
              {{ conversation.messages?.length || 0 }} {{ t('dialogs') }}
            </span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-dropdown @command="handleExport">
          <el-button type="primary">
            {{ t('exportReport')
            }}<el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="pdf">{{
                t('pdfFormat')
              }}</el-dropdown-item>
              <el-dropdown-item command="html">{{
                t('htmlFormat')
              }}</el-dropdown-item>
              <el-dropdown-item command="image">{{
                t('imageFormat')
              }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 主要报告内容 -->
    <div class="report-content">
      <!-- 总体评分 -->
      <el-card class="overall-section">
        <template #header>
          <div class="section-header">
            <el-icon><StarFilled /></el-icon>
            <span>{{ t('overallRating') }}</span>
          </div>
        </template>
        <div class="overall-content">
          <div class="score-circle">
            <div class="circle-content">
              <div class="score-value">{{ overallScore.toFixed(1) }}</div>
              <div class="score-label">{{ t('overallScore') }}</div>
            </div>
            <svg width="120" height="120" class="score-chart">
              <circle
                cx="60"
                cy="60"
                r="54"
                stroke="#ebeef5"
                stroke-width="12"
                fill="none"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                :stroke="getScoreColor(overallScore)"
                stroke-width="12"
                fill="none"
                stroke-linecap="round"
                :stroke-dasharray="overallScore * 68"
                stroke-dashoffset="340"
                transform="rotate(-90 60 60)"
              />
            </svg>
          </div>
          <div class="score-details">
            <div class="score-item">
              <label>{{ t('techAbility') }}</label>
              <el-progress
                :percentage="(technicalScore / 5) * 100"
                :color="getScoreColor(technicalScore)"
                :show-text="false"
              />
              <span class="score-number"
                >{{ technicalScore.toFixed(1) }}/5.0</span
              >
            </div>
            <div class="score-item">
              <label>{{ t('communication') }}</label>
              <el-progress
                :percentage="(communicationScore / 5) * 100"
                :color="getScoreColor(communicationScore)"
                :show-text="false"
              />
              <span class="score-number"
                >{{ communicationScore.toFixed(1) }}/5.0</span
              >
            </div>
            <div class="score-item">
              <label>{{ t('problemSolving') }}</label>
              <el-progress
                :percentage="(problemSolvingScore / 5) * 100"
                :color="getScoreColor(problemSolvingScore)"
                :show-text="false"
              />
              <span class="score-number"
                >{{ problemSolvingScore.toFixed(1) }}/5.0</span
              >
            </div>
          </div>
        </div>
      </el-card>

      <!-- 雷达图分析 -->
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card class="chart-section">
            <template #header>
              <div class="section-header">
                <el-icon><DataAnalysis /></el-icon>
                <span>{{ t('abilityRadar') }}</span>
              </div>
            </template>
            <div class="chart-container" ref="radarChartRef"></div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="chart-section">
            <template #header>
              <div class="section-header">
                <el-icon><PieChart /></el-icon>
                <span>{{ t('abilityDistribution') }}</span>
              </div>
            </template>
            <div class="chart-container" ref="pieChartRef"></div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 优势和改进 -->
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card class="analysis-section">
            <template #header>
              <div class="section-header">
                <el-icon><SuccessFilled /></el-icon>
                <span>{{ t('strengthHighlights') }}</span>
              </div>
            </template>
            <ul class="analysis-list">
              <li v-for="(strength, index) in strengths" :key="index">
                <el-icon color="#67c23a"><Check /></el-icon>
                {{ strength }}
              </li>
            </ul>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="analysis-section">
            <template #header>
              <div class="section-header">
                <el-icon><WarningFilled /></el-icon>
                <span>{{ t('improvementSuggestions') }}</span>
              </div>
            </template>
            <ul class="analysis-list">
              <li v-for="(suggestion, index) in suggestions" :key="index">
                <el-icon color="#e6a23c"><Lightning /></el-icon>
                {{ suggestion }}
              </li>
            </ul>
          </el-card>
        </el-col>
      </el-row>

      <!-- 详细分析 -->
      <el-card class="detailed-analysis">
        <template #header>
          <div class="section-header">
            <el-icon><Document /></el-icon>
            <span>{{ t('detailedAnalysis') }}</span>
          </div>
        </template>
        <div class="analysis-content">
          <div
            v-for="(analysis, index) in detailedAnalysis"
            :key="index"
            class="analysis-item"
          >
            <div class="analysis-header">
              <h4>{{ analysis.title }}</h4>
              <el-tag :type="getTagType(analysis.score)">
                {{ analysis.score.toFixed(1) }}/5.0
              </el-tag>
            </div>
            <div class="analysis-body">
              <p>{{ analysis.description }}</p>
              <div v-if="analysis.examples" class="analysis-examples">
                <span class="examples-label">{{ t('examples') }}：</span>
                <ul>
                  <li v-for="(example, idx) in analysis.examples" :key="idx">
                    {{ example }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 对话记录 -->
      <el-card class="dialogue-section">
        <template #header>
          <div class="section-header">
            <el-icon><ChatLineSquare /></el-icon>
            <span>{{ t('keyDialogs') }}</span>
          </div>
        </template>
        <div class="dialogue-content">
          <div
            v-for="message in keyMessages"
            :key="message.id"
            class="dialogue-item"
          >
            <div class="dialogue-header">
              <el-avatar
                :size="32"
                :icon="message.role === 'assistant' ? 'Avatar' : 'User'"
                :class="message.role"
              />
              <div class="dialogue-info">
                <div class="dialogue-name">
                  {{
                    message.role === 'assistant'
                      ? t('aiAssistant')
                      : t('user')
                  }}
                </div>
                <div class="dialogue-time">
                  {{ formatTime(message.timestamp) }}
                </div>
              </div>
              <el-tag
                v-if="message.analysis"
                :type="message.analysis.type"
                size="small"
              >
                {{ message.analysis.label }}
              </el-tag>
            </div>
            <div class="dialogue-message">{{ message.content }}</div>
            <div v-if="message.feedback" class="dialogue-feedback">
              <el-alert
                :type="message.feedback.type"
                :title="message.feedback.title"
                :closable="false"
              >
                {{ message.feedback.content }}
              </el-alert>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 总结建议 -->
      <el-card class="summary-section">
        <template #header>
          <div class="section-header">
            <el-icon><Collection /></el-icon>
            <span>{{ t('summaryAndAdvice') }}</span>
          </div>
        </template>
        <div class="summary-content">
          <div class="summary-overall">
            <h4>{{ t('overallReview') }}</h4>
            <p>{{ summary.overall }}</p>
          </div>
          <div class="summary-tips">
            <h4>{{ t('improvementTips') }}</h4>
            <ul>
              <li v-for="(tip, index) in summary.tips" :key="index">
                {{ tip }}
              </li>
            </ul>
          </div>
          <div class="summary-next">
            <h4>{{ t('nextActions') }}</h4>
            <div class="next-actions">
              <el-button type="primary" @click="startNewChat">
                <el-icon><VideoPlay /></el-icon>
                {{ t('startNewSession') }}
              </el-button>
              <el-button @click="viewHistory">
                <el-icon><Clock /></el-icon>
                {{ t('viewHistory') }}
              </el-button>
              <el-button @click="downloadReport">
                <el-icon><Download /></el-icon>
                {{ t('downloadFullReport') }}
              </el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConversationStore, usePreferenceStore } from '@/store'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import type { ChatMessage } from '@/store'

type TagType = 'primary' | 'success' | 'warning' | 'info' | 'danger'
type AlertType = 'success' | 'warning' | 'info' | 'error'

const route = useRoute()
const router = useRouter()
const conversationStore = useConversationStore()
const preferenceStore = usePreferenceStore()
const t = (key: string) => {
  const en: Record<string, string> = {
    back: 'Back',
    reportTitle: '对话分析报告',
    dialogs: 'messages',
    exportReport: 'Export Report',
    pdfFormat: 'PDF',
    htmlFormat: 'HTML',
    imageFormat: 'Image',
    overallRating: 'Overall Rating',
    overallScore: 'Overall Score',
    techAbility: 'Technical',
    communication: 'Communication',
    problemSolving: 'Problem Solving',
    abilityRadar: 'Capability Radar',
    abilityDistribution: 'Capability Distribution',
    strengthHighlights: 'Strengths',
    improvementSuggestions: 'Suggestions',
    detailedAnalysis: 'Detailed Analysis',
    examples: 'Examples',
    keyDialogs: 'Key Dialogues',
    aiAssistant: 'AI Assistant',
    user: 'User',
    summaryAndAdvice: 'Summary & Advice',
    overallReview: 'Overall Review',
    improvementTips: 'Improvement Tips',
    nextActions: 'Next Actions',
    startNewSession: '开始新的会话',
    viewHistory: 'View History',
    downloadFullReport: 'Download Full Report'
  }
  if (preferenceStore.language === 'en-US') return en[key] || key
  return (
    {
      back: '返回',
      reportTitle: '对话分析报告',
      dialogs: '条消息',
      exportReport: '导出报告',
      pdfFormat: 'PDF 格式',
      htmlFormat: 'HTML 格式',
      imageFormat: '图片格式',
      overallRating: '总体评分',
      overallScore: '综合得分',
      techAbility: '技术能力',
      communication: '沟通表达',
      problemSolving: '问题解决',
      abilityRadar: '能力雷达图',
      abilityDistribution: '能力分布',
      strengthHighlights: '优势亮点',
      improvementSuggestions: '改进建议',
      detailedAnalysis: '详细分析报告',
      examples: '示例',
      keyDialogs: '关键对话记录',
      aiAssistant: 'AI 助手',
      user: '我',
      summaryAndAdvice: '总结与建议',
      overallReview: '总体评价',
      improvementTips: '提升建议',
      nextActions: '下一步行动',
      startNewSession: '开始新的会话',
      viewHistory: '查看历史记录',
      downloadFullReport: '下载完整报告'
    }[key] || key
  )
}

// 图表引用
const radarChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()

// 图表实例
let radarChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null
const handleWindowResize = () => {
  radarChart?.resize()
  pieChart?.resize()
}

// 获取对话数据
const conversationId = route.params.id as string
const conversation = computed(() => {
  return (
    conversationStore.getConversationById(conversationId) || {
      id: conversationId,
      title: '对话报告',
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      status: 'completed' as const,
      messages: [] as ChatMessage[],
      analysis: {
        technicalScore: 0,
        communicationScore: 0,
        problemSolvingScore: 0,
        overallScore: 0,
        strengths: [],
        weaknesses: [],
        suggestions: []
      }
    }
  )
})

// 计算属性
const overallScore = computed(() => conversation.value.analysis?.overallScore || 0)
const technicalScore = computed(
  () => conversation.value.analysis?.technicalScore || 0
)
const communicationScore = computed(
  () => conversation.value.analysis?.communicationScore || 0
)
const problemSolvingScore = computed(
  () => conversation.value.analysis?.problemSolvingScore || 0
)
const strengths = computed(() => conversation.value.analysis?.strengths || [])
const suggestions = computed(() => conversation.value.analysis?.suggestions || [])

// 详细分析数据
const detailedAnalysis = computed(() => [
  {
    title:
      preferenceStore.language === 'en-US'
        ? 'Technical Knowledge'
        : '技术知识掌握',
    score: technicalScore.value,
    description:
      preferenceStore.language === 'en-US'
        ? 'Evaluates depth and breadth of technology understanding, including fundamentals, framework usage and best practices.'
        : '评估您对相关技术的理解深度和广度，包括基础概念、框架使用、最佳实践等。',
    examples:
      preferenceStore.language === 'en-US'
        ? ['Understanding Vue3 reactivity', 'Applying TypeScript type system']
        : ['对 Vue3 响应式原理的理解', 'TypeScript 类型系统的应用']
  },
  {
    title:
      preferenceStore.language === 'en-US' ? 'Problem Solving' : '问题解决能力',
    score: problemSolvingScore.value,
    description:
      preferenceStore.language === 'en-US'
        ? 'Evaluates problem analysis, solution design and implementation capability, including algorithmic thinking and system design.'
        : '评估您分析问题、设计方案和实施解决方案的能力，包括算法思维和系统设计。',
    examples:
      preferenceStore.language === 'en-US'
        ? ['Complex problem decomposition', 'System design trade-off thinking']
        : ['复杂问题的分解思路', '系统设计的权衡考虑']
  },
  {
    title:
      preferenceStore.language === 'en-US' ? 'Communication' : '沟通表达能力',
    score: communicationScore.value,
    description:
      preferenceStore.language === 'en-US'
        ? 'Evaluates clear expression, logical narration and effective communication, including structured answering.'
        : '评估您清晰表达思想、逻辑陈述和有效沟通的能力，包括回答问题的条理性。',
    examples:
      preferenceStore.language === 'en-US'
        ? [
            'Simple explanation of technical concepts',
            'Clear project experience description'
          ]
        : ['技术概念的通俗解释', '项目经验的清晰描述']
  }
])

// 关键对话记录
const keyMessages = computed(() => {
  const messages = conversation.value.messages || []
  return messages.slice(0, 5).map((msg, index) => ({
    ...msg,
    analysis:
      index % 2 === 0
        ? {
            type: 'success' as TagType,
            label:
              preferenceStore.language === 'en-US'
                ? 'Strong Answer'
                : '优秀回答'
          }
        : null,
    feedback:
      index === 1
        ? {
            type: 'warning' as AlertType,
            title:
              preferenceStore.language === 'en-US' ? 'Suggestion' : '改进建议',
            content:
              preferenceStore.language === 'en-US'
                ? 'You can describe implementation details in more depth.'
                : '可以更详细地描述技术实现细节'
          }
        : null
  }))
})

// 总结数据
const summary = computed(() => ({
  overall:
    preferenceStore.language === 'en-US'
      ? 'You demonstrated solid fundamentals and clear communication. You performed especially well in problem solving and produced practical solutions quickly.'
      : '您在这次对话中展现了扎实的技术基础和良好的沟通能力。特别是在问题解决方面表现出色，能够快速理解问题并提出解决方案。',
  tips:
    preferenceStore.language === 'en-US'
      ? [
          'Strengthen system design knowledge',
          'Practice more real-world technical scenarios',
          'Improve answer structure and clarity',
          'Learn more industry best practices'
        ]
      : [
          '加强系统设计相关知识的积累',
          '练习更多实际场景的技术问题',
          '提高回答问题的条理性和逻辑性',
          '学习更多行业最佳实践和模式'
        ]
}))

// 格式化时间
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (ms: number) => {
  const minutes = Math.floor(ms / 1000 / 60)
  const seconds = Math.floor((ms / 1000) % 60)
  return `${minutes}分${seconds}秒`
}

// 根据分数获取颜色
const getScoreColor = (score: number) => {
  if (score >= 4) return '#67c23a'
  if (score >= 3) return '#e6a23c'
  if (score >= 2) return '#f56c6c'
  return '#909399'
}

const getTagType = (score: number): TagType => {
  if (score >= 4) return 'success'
  if (score >= 3) return 'warning'
  return 'danger'
}

// 处理导出
const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const buildLocalReportText = () => {
  const lines: string[] = []
  lines.push(`标题: ${conversation.value.title}`)
  lines.push(`开始时间: ${formatDate(conversation.value.startTime)}`)
  lines.push(`时长: ${formatDuration(conversation.value.duration)}`)
  lines.push(`综合得分: ${overallScore.value.toFixed(1)}`)
  lines.push('')
  lines.push('对话记录:')
  for (const m of conversation.value.messages || []) {
    lines.push(
      `[${formatTime(m.timestamp)}] ${
        m.role === 'assistant' ? '智能体' : '我'
      }: ${m.content}`
    )
  }
  return lines.join('\n')
}

const handleExport = (format: string) => {
  const safeTitle = conversation.value.title.replace(/[\\/:*?"<>|]/g, '_')
  const text = buildLocalReportText()
  if (format === 'pdf' || format === 'image') {
    const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${safeTitle}</title></head><body><pre>${text}</pre></body></html>`
    triggerBlobDownload(
      new Blob([html], { type: 'text/html;charset=utf-8' }),
      `${safeTitle}.html`
    )
    ElMessage.info(format === 'pdf' ? '已导出为 HTML，请自行打印为 PDF' : '图片导出暂未开放，已导出 HTML')
    return
  }

  const normalized = format === 'html' ? 'html' : 'txt'
  if (normalized === 'html') {
    const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${safeTitle}</title></head><body><pre>${text}</pre></body></html>`
    triggerBlobDownload(
      new Blob([html], { type: 'text/html;charset=utf-8' }),
      `${safeTitle}.html`
    )
  } else {
    triggerBlobDownload(
      new Blob([text], { type: 'text/plain;charset=utf-8' }),
      `${safeTitle}.txt`
    )
  }
  ElMessage.success('导出成功')
}

// 下载报告
const downloadReport = async () => {
  await handleExport('txt')
}

// 开始新的会话
const startNewChat = () => {
  router.push('/chat')
}

// 查看历史记录
const viewHistory = () => {
  router.push('/history')
}

// 初始化雷达图
const initRadarChart = () => {
  if (!radarChartRef.value) return

  radarChart = echarts.init(radarChartRef.value)

  const option = {
    radar: {
      indicator: [
        { name: '技术知识', max: 5 },
        { name: '问题解决', max: 5 },
        { name: '沟通表达', max: 5 },
        { name: '逻辑思维', max: 5 },
        { name: '学习能力', max: 5 },
        { name: '应变能力', max: 5 }
      ],
      center: ['50%', '50%'],
      radius: '65%'
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: [
              technicalScore.value,
              problemSolvingScore.value,
              communicationScore.value,
              4.2,
              4.5,
              3.8
            ],
            name: '本次得分',
            areaStyle: {
              color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.8, [
                { offset: 0, color: 'rgba(102, 126, 234, 0.1)' },
                { offset: 1, color: 'rgba(102, 126, 234, 0.4)' }
              ])
            },
            lineStyle: {
              color: '#667eea'
            },
            itemStyle: {
              color: '#667eea'
            }
          },
          {
            value: [3.8, 3.6, 3.9, 4.0, 4.1, 3.7],
            name: '平均分',
            areaStyle: {
              color: new echarts.graphic.RadialGradient(0.5, 0.5, 0.8, [
                { offset: 0, color: 'rgba(144, 147, 153, 0.1)' },
                { offset: 1, color: 'rgba(144, 147, 153, 0.2)' }
              ])
            },
            lineStyle: {
              color: '#909399'
            },
            itemStyle: {
              color: '#909399'
            }
          }
        ]
      }
    ]
  }

  radarChart.setOption(option)
}

// 初始化饼图
const initPieChart = () => {
  if (!pieChartRef.value) return

  pieChart = echarts.init(pieChartRef.value)

  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      top: 'bottom'
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '40%'],
        data: [
          { value: technicalScore.value, name: '技术知识' },
          { value: problemSolvingScore.value, name: '问题解决' },
          { value: communicationScore.value, name: '沟通表达' },
          { value: 4.2, name: '逻辑思维' },
          { value: 4.5, name: '学习能力' },
          { value: 3.8, name: '应变能力' }
        ],
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }

  pieChart.setOption(option)
}

// 生命周期
onMounted(() => {
  initRadarChart()
  initPieChart()

  // 监听窗口大小变化，重新渲染图表
  window.addEventListener('resize', handleWindowResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize)

  radarChart?.dispose()
  pieChart?.dispose()
})
</script>

<style lang="scss" scoped>
.report-container {
  padding: 24px;

  .report-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    color: white;

    .header-content {
      display: flex;
      align-items: center;
      gap: 24px;

      .back-button {
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: white;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      }

      .header-info {
        h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
        }

        .report-meta {
          display: flex;
          gap: 24px;
          font-size: 14px;
          opacity: 0.9;

          .meta-item {
            display: flex;
            align-items: center;
            gap: 4px;
          }
        }
      }
    }
  }

  .report-content {
    > * {
      margin-bottom: 20px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: bold;

      .el-icon {
        color: #409eff;
      }
    }

    .overall-section {
      .overall-content {
        display: flex;
        align-items: center;
        gap: 60px;

        .score-circle {
          position: relative;
          width: 120px;
          height: 120px;

          .circle-content {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;

            .score-value {
              font-size: 36px;
              font-weight: bold;
              color: #303133;
            }

            .score-label {
              font-size: 14px;
              color: #909399;
            }
          }

          .score-chart {
            transform: rotate(-90deg);
          }
        }

        .score-details {
          flex: 1;

          .score-item {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 20px;

            &:last-child {
              margin-bottom: 0;
            }

            label {
              width: 80px;
              font-size: 14px;
              color: #606266;
              font-weight: 500;
            }

            :deep(.el-progress) {
              flex: 1;
              .el-progress-bar {
                margin-right: 8px;
              }
            }

            .score-number {
              width: 60px;
              text-align: right;
              font-size: 14px;
              font-weight: 500;
              color: #303133;
            }
          }
        }
      }
    }

    .chart-section {
      .chart-container {
        width: 100%;
        height: 300px;
      }
    }

    .analysis-section {
      .analysis-list {
        margin: 0;
        padding-left: 0;

        li {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
          padding: 12px;
          background: #f8f9fb;
          border-radius: 8px;
          line-height: 1.6;
          color: #606266;

          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }

    .detailed-analysis {
      .analysis-content {
        .analysis-item {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid #ebeef5;

          &:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
          }

          .analysis-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;

            h4 {
              margin: 0;
              font-size: 16px;
              color: #303133;
            }
          }

          .analysis-body {
            p {
              margin: 0 0 12px 0;
              color: #606266;
              line-height: 1.6;
            }

            .analysis-examples {
              background: #f8f9fb;
              padding: 12px 16px;
              border-radius: 8px;

              .examples-label {
                font-weight: 500;
                color: #303133;
              }

              ul {
                margin: 8px 0 0 20px;
                padding: 0;

                li {
                  color: #606266;
                  margin-bottom: 4px;

                  &:last-child {
                    margin-bottom: 0;
                  }
                }
              }
            }
          }
        }
      }
    }

    .dialogue-section {
      .dialogue-content {
        .dialogue-item {
          margin-bottom: 24px;
          padding-bottom: 24px;
          border-bottom: 1px solid #ebeef5;

          &:last-child {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
          }

          .dialogue-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;

            .el-avatar.assistant {
              background: #409eff;
            }

            .el-avatar.user {
              background: #67c23a;
            }

            .dialogue-info {
              flex: 1;

              .dialogue-name {
                font-weight: 500;
                color: #303133;
                margin-bottom: 2px;
              }

              .dialogue-time {
                font-size: 12px;
                color: #909399;
              }
            }
          }

          .dialogue-message {
            padding: 12px 16px;
            background: #f8f9fb;
            border-radius: 8px;
            line-height: 1.6;
            color: #606266;
          }

          .dialogue-feedback {
            margin-top: 12px;
          }
        }
      }
    }

    .summary-section {
      .summary-content {
        > div {
          margin-bottom: 24px;

          &:last-child {
            margin-bottom: 0;
          }

          h4 {
            margin: 0 0 12px 0;
            font-size: 16px;
            color: #303133;
          }

          p,
          ul {
            color: #606266;
            line-height: 1.6;
          }

          ul {
            margin: 0;
            padding-left: 20px;

            li {
              margin-bottom: 8px;
            }
          }
        }

        .summary-next {
          .next-actions {
            display: flex;
            gap: 12px;
            margin-top: 16px;
          }
        }
      }
    }
  }
}

html[data-theme='dark'] .report-container {
  background: #121417;
}

html[data-theme='dark'] .report-container .analysis-section .analysis-list li,
html[data-theme='dark'] .report-container .analysis-section,
html[data-theme='dark'] .report-container .detailed-analysis,
html[data-theme='dark'] .report-container .dialogue-section,
html[data-theme='dark'] .report-container .detailed-analysis .analysis-examples,
html[data-theme='dark'] .report-container .dialogue-section .dialogue-message {
  background: #212833;
  color: #dbe2ee;
}

html[data-theme='dark']
  .report-container
  .detailed-analysis
  .analysis-item
  .analysis-body
  .analysis-examples
  .examples-label,
html[data-theme='dark'] .report-container .summary-section h4,
html[data-theme='dark'] .report-container .detailed-analysis h4 {
  color: #f3f6fb;
}

html[data-theme='dark'] .report-container .detailed-analysis .analysis-item,
html[data-theme='dark'] .report-container .dialogue-section .dialogue-item {
  border-bottom-color: #2f3a49;
}
</style>
