<template>
  <div class="report-container">
    <!-- 报告头部 -->
    <div class="report-header">
      <div class="header-content">
        <el-button @click="router.back()" class="back-button">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <div class="header-info">
          <h2>面试分析报告</h2>
          <div class="report-meta">
            <span class="meta-item">
              <el-icon><Calendar /></el-icon>
              {{ formatDate(interview.startTime) }}
            </span>
            <span class="meta-item">
              <el-icon><Timer /></el-icon>
              {{ formatDuration(interview.duration) }}
            </span>
            <span class="meta-item">
              <el-icon><ChatLineSquare /></el-icon>
              {{ interview.messages?.length || 0 }} 条对话
            </span>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-dropdown @command="handleExport">
          <el-button type="primary">
            导出报告<el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="pdf">PDF 格式</el-dropdown-item>
              <el-dropdown-item command="html">HTML 格式</el-dropdown-item>
              <el-dropdown-item command="image">图片格式</el-dropdown-item>
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
            <span>总体评分</span>
          </div>
        </template>
        <div class="overall-content">
          <div class="score-circle">
            <div class="circle-content">
              <div class="score-value">{{ overallScore.toFixed(1) }}</div>
              <div class="score-label">综合得分</div>
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
              <label>技术能力</label>
              <el-progress
                :percentage="(technicalScore / 5) * 100"
                :color="getScoreColor(technicalScore)"
                :show-text="false"
              />
              <span class="score-number">{{ technicalScore.toFixed(1) }}/5.0</span>
            </div>
            <div class="score-item">
              <label>沟通表达</label>
              <el-progress
                :percentage="(communicationScore / 5) * 100"
                :color="getScoreColor(communicationScore)"
                :show-text="false"
              />
              <span class="score-number">{{ communicationScore.toFixed(1) }}/5.0</span>
            </div>
            <div class="score-item">
              <label>问题解决</label>
              <el-progress
                :percentage="(problemSolvingScore / 5) * 100"
                :color="getScoreColor(problemSolvingScore)"
                :show-text="false"
              />
              <span class="score-number">{{ problemSolvingScore.toFixed(1) }}/5.0</span>
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
                <span>能力雷达图</span>
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
                <span>能力分布</span>
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
                <span>优势亮点</span>
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
                <span>改进建议</span>
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
            <span>详细分析报告</span>
          </div>
        </template>
        <div class="analysis-content">
          <div v-for="(analysis, index) in detailedAnalysis" :key="index" class="analysis-item">
            <div class="analysis-header">
              <h4>{{ analysis.title }}</h4>
              <el-tag :type="getTagType(analysis.score)">
                {{ analysis.score.toFixed(1) }}/5.0
              </el-tag>
            </div>
            <div class="analysis-body">
              <p>{{ analysis.description }}</p>
              <div v-if="analysis.examples" class="analysis-examples">
                <span class="examples-label">示例：</span>
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
            <span>关键对话记录</span>
          </div>
        </template>
        <div class="dialogue-content">
          <div v-for="message in keyMessages" :key="message.id" class="dialogue-item">
            <div class="dialogue-header">
              <el-avatar 
                :size="32"
                :icon="message.role === 'assistant' ? 'Avatar' : 'User'"
                :class="message.role"
              />
              <div class="dialogue-info">
                <div class="dialogue-name">
                  {{ message.role === 'assistant' ? 'AI 面试官' : '应聘者' }}
                </div>
                <div class="dialogue-time">{{ formatTime(message.timestamp) }}</div>
              </div>
              <el-tag v-if="message.analysis" :type="message.analysis.type" size="small">
                {{ message.analysis.label }}
              </el-tag>
            </div>
            <div class="dialogue-message">{{ message.content }}</div>
            <div v-if="message.feedback" class="dialogue-feedback">
              <el-alert :type="message.feedback.type" :title="message.feedback.title" :closable="false">
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
            <span>总结与建议</span>
          </div>
        </template>
        <div class="summary-content">
          <div class="summary-overall">
            <h4>总体评价</h4>
            <p>{{ summary.overall }}</p>
          </div>
          <div class="summary-tips">
            <h4>提升建议</h4>
            <ul>
              <li v-for="(tip, index) in summary.tips" :key="index">{{ tip }}</li>
            </ul>
          </div>
          <div class="summary-next">
            <h4>下一步行动</h4>
            <div class="next-actions">
              <el-button type="primary" @click="startNewInterview">
                <el-icon><VideoPlay /></el-icon>
                开始新的面试
              </el-button>
              <el-button @click="viewHistory">
                <el-icon><Clock /></el-icon>
                查看历史记录
              </el-button>
              <el-button @click="downloadReport">
                <el-icon><Download /></el-icon>
                下载完整报告
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
import { useInterviewStore } from '@/store'
import * as echarts from 'echarts'

const route = useRoute()
const router = useRouter()
const interviewStore = useInterviewStore()

// 图表引用
const radarChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()

// 图表实例
let radarChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

// 获取面试数据
const interviewId = route.params.id as string
const interview = computed(() => {
  return interviewStore.getInterviewById(interviewId) || {
    title: '面试报告',
    startTime: Date.now(),
    duration: 0,
    messages: [],
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
})

// 计算属性
const overallScore = computed(() => interview.value.analysis?.overallScore || 0)
const technicalScore = computed(() => interview.value.analysis?.technicalScore || 0)
const communicationScore = computed(() => interview.value.analysis?.communicationScore || 0)
const problemSolvingScore = computed(() => interview.value.analysis?.problemSolvingScore || 0)
const strengths = computed(() => interview.value.analysis?.strengths || [])
const suggestions = computed(() => interview.value.analysis?.suggestions || [])

// 详细分析数据
const detailedAnalysis = computed(() => [
  {
    title: '技术知识掌握',
    score: technicalScore.value,
    description: '评估您对相关技术的理解深度和广度，包括基础概念、框架使用、最佳实践等。',
    examples: ['对 Vue3 响应式原理的理解', 'TypeScript 类型系统的应用']
  },
  {
    title: '问题解决能力',
    score: problemSolvingScore.value,
    description: '评估您分析问题、设计方案和实施解决方案的能力，包括算法思维和系统设计。',
    examples: ['复杂问题的分解思路', '系统设计的权衡考虑']
  },
  {
    title: '沟通表达能力',
    score: communicationScore.value,
    description: '评估您清晰表达思想、逻辑陈述和有效沟通的能力，包括回答问题的条理性。',
    examples: ['技术概念的通俗解释', '项目经验的清晰描述']
  }
])

// 关键对话记录
const keyMessages = computed(() => {
  const messages = interview.value.messages || []
  // 提取有意义的对话
  return messages.slice(0, 5).map((msg, index) => ({
    ...msg,
    analysis: index % 2 === 0 ? { type: 'success', label: '优秀回答' } : null,
    feedback: index === 1 ? {
      type: 'warning',
      title: '改进建议',
      content: '可以更详细地描述技术实现细节'
    } : null
  }))
})

// 总结数据
const summary = computed(() => ({
  overall: '您在这次面试中展现了扎实的技术基础和良好的沟通能力。特别是在问题解决方面表现出色，能够快速理解问题并提出解决方案。',
  tips: [
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

const getTagType = (score: number) => {
  if (score >= 4) return 'success'
  if (score >= 3) return 'warning'
  return 'danger'
}

// 处理导出
const handleExport = (format: string) => {
  switch (format) {
    case 'pdf':
      ElMessage.info('导出为 PDF 格式')
      break
    case 'html':
      ElMessage.info('导出为 HTML 格式')
      break
    case 'image':
      ElMessage.info('导出为图片格式')
      break
  }
}

// 下载报告
const downloadReport = () => {
  ElMessage.success('报告下载已开始')
}

// 开始新的面试
const startNewInterview = () => {
  router.push('/dashboard')
}

// 查看历史记录
const viewHistory = () => {
  router.push('/dashboard/history')
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
  window.addEventListener('resize', () => {
    radarChart?.resize()
    pieChart?.resize()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', () => {
    radarChart?.resize()
    pieChart?.resize()
  })

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

          p, ul {
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
</style>
