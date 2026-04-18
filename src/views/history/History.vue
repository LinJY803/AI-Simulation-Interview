<template>
  <div class="history-container">
    <div class="history-header">
      <h2>{{ t('historyTitle') }}</h2>
      <el-input
        v-model="searchQuery"
        :placeholder="t('searchPlaceholder')"
        style="width: 300px"
        clearable
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon" style="background: #ecf5ff">
                <el-icon color="#409eff" :size="24"><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <p class="stat-label">{{ t('totalSessions') }}</p>
                <p class="stat-value">{{ stats.totalCount }}</p>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon" style="background: #f0f9eb">
                <el-icon color="#67c23a" :size="24"><Check /></el-icon>
              </div>
              <div class="stat-info">
                <p class="stat-label">{{ t('completedCount') }}</p>
                <p class="stat-value">{{ stats.completedCount }}</p>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon" style="background: #fef0f0">
                <el-icon color="#f56c6c" :size="24"><TrendCharts /></el-icon>
              </div>
              <div class="stat-info">
                <p class="stat-label">{{ t('avgScore') }}</p>
                <p class="stat-value">{{ stats.averageScore.toFixed(1) }}</p>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon" style="background: #f4f4f5">
                <el-icon color="#909399" :size="24"><Timer /></el-icon>
              </div>
              <div class="stat-info">
                <p class="stat-label">{{ t('totalDuration') }}</p>
                <p class="stat-value">
                  {{ formatDuration(stats.totalDuration) }}
                </p>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 会话历史表格 -->
    <el-card class="history-table-card">
      <template #header>
        <div class="table-header">
          <span>{{ t('records') }}</span>
          <div class="table-actions">
            <el-button-group>
              <el-button
                :type="filterType === 'all' ? 'primary' : ''"
                @click="filterType = 'all'"
              >
                {{ t('all') }}
              </el-button>
              <el-button
                :type="filterType === 'completed' ? 'primary' : ''"
                @click="filterType = 'completed'"
              >
                {{ t('completed') }}
              </el-button>
              <el-button
                :type="filterType === 'ongoing' ? 'primary' : ''"
                @click="filterType = 'ongoing'"
              >
                {{ t('ongoing') }}
              </el-button>
            </el-button-group>
          </div>
        </div>
      </template>

      <el-table
        :data="filteredConversations"
        style="width: 100%"
        v-loading="loading"
        @row-click="handleRowClick"
      >
        <el-table-column :label="t('chatTitle')" min-width="200">
          <template #default="{ row }">
            <div class="session-title">
              <el-tag
                :type="
                  row.status === 'completed'
                    ? 'success'
                    : row.status === 'ongoing'
                    ? 'primary'
                    : 'info'
                "
                size="small"
              >
                {{ getStatusLabel(row.status) }}
              </el-tag>
              <span class="title-text">{{
                localizeConversationTitle(row.title)
              }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="startTime" :label="t('startTime')" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.startTime) }}
          </template>
        </el-table-column>

        <el-table-column :label="t('duration')" width="120">
          <template #default="{ row }">
            {{ formatDuration(row.duration) }}
          </template>
        </el-table-column>

        <el-table-column :label="t('score')" width="100">
          <template #default="{ row }">
            <el-rate
              v-if="row.score"
              :model-value="row.score / 20"
              disabled
              :colors="['#99A9BF', '#F7BA2A', '#FF9900']"
            />
            <span v-else class="no-score">--</span>
          </template>
        </el-table-column>

        <el-table-column :label="t('messageCount')" width="100">
          <template #default="{ row }">
            {{ row.messages?.length || 0 }}
          </template>
        </el-table-column>

        <el-table-column :label="t('actions')" width="120" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                type="primary"
                size="small"
                @click.stop="viewReport(row.id)"
              >
                <el-icon><Document /></el-icon>
              </el-button>
              <el-button
                type="info"
                size="small"
                @click.stop="deleteConversation(row.id)"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalConversations"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 会话详情侧边栏 -->
    <el-drawer
      v-model="drawerVisible"
      title="会话详情"
      size="600px"
      :with-header="false"
      direction="rtl"
    >
      <div class="drawer-content" v-if="selectedConversation">
        <div class="drawer-header">
          <h3>{{ localizeConversationTitle(selectedConversation.title) }}</h3>
          <el-button text @click="drawerVisible = false">
            <el-icon><Close /></el-icon>
          </el-button>
        </div>

        <div class="session-details">
          <!-- 基本信息 -->
          <el-card class="details-section">
            <template #header>
              <div class="section-header">
                <el-icon><InfoFilled /></el-icon>
                <span>基本信息</span>
              </div>
            </template>
            <div class="info-grid">
              <div class="info-item">
                <label>状态</label>
                <el-tag
                  :type="
                    selectedConversation.status === 'completed'
                      ? 'success'
                      : 'primary'
                  "
                  size="small"
                >
                  {{ getStatusLabel(selectedConversation.status) }}
                </el-tag>
              </div>
              <div class="info-item">
                <label>开始时间</label>
                <span>{{ formatDateTime(selectedConversation.startTime) }}</span>
              </div>
              <div class="info-item">
                <label>结束时间</label>
                <span>{{
                  selectedConversation.endTime
                    ? formatDateTime(selectedConversation.endTime)
                    : '--'
                }}</span>
              </div>
              <div class="info-item">
                <label>总时长</label>
                <span>{{ formatDuration(selectedConversation.duration) }}</span>
              </div>
              <div class="info-item">
                <label>消息数量</label>
                <span>{{ selectedConversation.messages?.length || 0 }}</span>
              </div>
            </div>
          </el-card>

          <!-- 消息列表 -->
          <el-card class="details-section">
            <template #header>
              <div class="section-header">
                <el-icon><ChatLineSquare /></el-icon>
                <span>对话记录</span>
              </div>
            </template>
            <div class="message-history">
              <div
                v-for="message in selectedConversation.messages"
                :key="message.id"
                class="history-message"
                :class="message.role"
              >
                <div class="message-avatar">
                  <el-avatar
                    :size="32"
                    :icon="message.role === 'assistant' ? 'Avatar' : 'User'"
                  />
                </div>
                <div class="message-content">
                  <div class="message-name">
                    {{ message.role === 'assistant' ? '智能体' : '我' }}
                    <span class="message-time">{{
                      formatTime(message.timestamp)
                    }}</span>
                  </div>
                  <div class="message-text">
                    {{ message.content }}
                  </div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 分析结果 -->
          <el-card v-if="selectedConversation.analysis" class="details-section">
            <template #header>
              <div class="section-header">
                <el-icon><TrendCharts /></el-icon>
                <span>分析结果</span>
              </div>
            </template>
            <div class="analysis-content">
              <div class="score-card">
                <div class="score-header">
                  <h4>总体评分</h4>
                  <div class="score-value">
                    {{ selectedConversation.analysis.overallScore.toFixed(1) }}/5.0
                  </div>
                </div>
                <el-progress
                  :percentage="
                    (selectedConversation.analysis.overallScore / 5) * 100
                  "
                  :color="
                    getScoreColor(selectedConversation.analysis.overallScore)
                  "
                />
              </div>

              <el-divider />

              <div class="detailed-scores">
                <h5>详细评分</h5>
                <div class="scores-grid">
                  <div class="score-item">
                    <label>技术能力</label>
                    <el-progress
                      :percentage="
                        (selectedConversation.analysis.technicalScore / 5) * 100
                      "
                      :color="
                        getScoreColor(selectedConversation.analysis.technicalScore)
                      "
                    />
                  </div>
                  <div class="score-item">
                    <label>沟通能力</label>
                    <el-progress
                      :percentage="
                        (selectedConversation.analysis.communicationScore / 5) *
                        100
                      "
                      :color="
                        getScoreColor(
                          selectedConversation.analysis.communicationScore
                        )
                      "
                    />
                  </div>
                  <div class="score-item">
                    <label>问题解决</label>
                    <el-progress
                      :percentage="
                        (selectedConversation.analysis.problemSolvingScore / 5) *
                        100
                      "
                      :color="
                        getScoreColor(
                          selectedConversation.analysis.problemSolvingScore
                        )
                      "
                    />
                  </div>
                </div>
              </div>

              <el-divider />

              <div class="strengths-weaknesses">
                <el-row :gutter="20">
                  <el-col :span="12">
                    <h5>优势</h5>
                    <ul>
                      <li
                        v-for="strength in selectedConversation.analysis.strengths"
                        :key="strength"
                      >
                        {{ strength }}
                      </li>
                    </ul>
                  </el-col>
                  <el-col :span="12">
                    <h5>改进建议</h5>
                    <ul>
                      <li
                        v-for="suggestion in selectedConversation.analysis
                          .suggestions"
                        :key="suggestion"
                      >
                        {{ suggestion }}
                      </li>
                    </ul>
                  </el-col>
                </el-row>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConversationStore, usePreferenceStore } from '@/store'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ChatSession } from '@/store'

const router = useRouter()
const conversationStore = useConversationStore()
const preferenceStore = usePreferenceStore()
const t = (key: string) => {
  const en: Record<string, string> = {
    historyTitle: 'Conversation History',
    searchPlaceholder: 'Search conversations...',
    totalSessions: 'Total Conversations',
    completedCount: 'Completed',
    avgScore: 'Average Score',
    totalDuration: 'Total Duration',
    records: 'Conversation Records',
    all: 'All',
    completed: 'Completed',
    ongoing: 'Ongoing',
    exportData: 'Export',
    csvFormat: 'CSV',
    excelFormat: 'Excel',
    chatTitle: 'Title',
    startTime: 'Start Time',
    duration: 'Duration',
    score: 'Score',
    messageCount: 'Messages',
    actions: 'Actions'
  }
  if (preferenceStore.language === 'en-US') return en[key] || key
  return (
    {
      historyTitle: '对话历史',
      searchPlaceholder: '搜索对话...',
      totalSessions: '总会话次数',
      completedCount: '已完成',
      avgScore: '平均得分',
      totalDuration: '总时长',
      records: '对话记录',
      all: '全部',
      completed: '已完成',
      ongoing: '进行中',
      exportData: '导出数据',
      csvFormat: 'CSV 格式',
      excelFormat: 'Excel 格式',
      chatTitle: '标题',
      startTime: '开始时间',
      duration: '时长',
      score: '得分',
      messageCount: '消息数',
      actions: '操作'
    }[key] || key
  )
}

// 状态变量
const searchQuery = ref('')
const filterType = ref<'all' | 'completed' | 'ongoing'>('all')
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const drawerVisible = ref(false)
const selectedConversation = ref<ChatSession | null>(null)

// 状态标签映射
const getStatusLabel = (status: string) => {
  if (preferenceStore.language === 'en-US') {
    return (
      {
        ongoing: 'Ongoing',
        completed: 'Completed',
        canceled: 'Canceled'
      }[status] || status
    )
  }
  return (
    {
      ongoing: '进行中',
      completed: '已完成',
      canceled: '已取消'
    }[status] || status
  )
}

const localizeConversationTitle = (title: string) => {
  if (preferenceStore.language !== 'en-US') return title
  return title
    .replace(/前端开发工程师/g, 'Frontend Engineer')
    .replace(/后端开发工程师/g, 'Backend Engineer')
    .replace(/全栈工程师/g, 'Full-stack Engineer')
    .replace(/移动端开发工程师/g, 'Mobile Engineer')
    .replace(/算法工程师/g, 'Algorithm Engineer')
    .replace(/测试工程师/g, 'QA Engineer')
    .replace(/简单/g, 'Easy')
    .replace(/中等/g, 'Medium')
    .replace(/困难/g, 'Hard')
    .replace(/难度/g, 'Difficulty')
}

// 计算属性
const stats = computed(() => ({
  totalCount: conversationStore.conversationHistory.length,
  completedCount: conversationStore.conversationHistory.filter(i => i.status === 'completed').length,
  averageScore: conversationStore.conversationHistory.length
    ? conversationStore.conversationHistory.reduce((sum, i) => sum + (i.score || 0), 0) / conversationStore.conversationHistory.length
    : 0,
  totalDuration: conversationStore.conversationHistory.reduce((sum, i) => sum + (i.duration || 0), 0),
}))

const filteredWithoutPagination = computed(() => {
  let conversations = conversationStore.conversationHistory

  // 状态筛选
  if (filterType.value !== 'all') {
    conversations = conversations.filter(
      conversation => conversation.status === filterType.value
    )
  }

  // 搜索筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    conversations = conversations.filter(
      conversation =>
        conversation.title.toLowerCase().includes(query) ||
        conversation.id.toLowerCase().includes(query)
    )
  }

  return conversations
})

const totalConversations = computed(() => filteredWithoutPagination.value.length)

const filteredConversations = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredWithoutPagination.value.slice(start, end)
})

watch([searchQuery, filterType, pageSize], () => {
  currentPage.value = 1
})

watch(totalConversations, total => {
  const maxPage = Math.max(1, Math.ceil(total / pageSize.value))
  if (currentPage.value > maxPage) {
    currentPage.value = maxPage
  }
})

// 格式化时间
const formatDateTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化时长
const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}小时${minutes % 60}分钟`
  }
  if (minutes > 0) {
    return `${minutes}分钟${seconds % 60}秒`
  }
  return `${seconds}秒`
}

// 根据分数获取颜色
const getScoreColor = (score: number) => {
  if (score >= 4) return '#67c23a'
  if (score >= 3) return '#e6a23c'
  if (score >= 2) return '#f56c6c'
  return '#909399'
}

// 查看报告
const viewReport = (conversationId: string) => {
  router.push(`/report/${conversationId}`)
}

// 删除会话记录
const deleteConversation = async (conversationId: string) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这条会话记录吗？删除后将无法恢复。',
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 这里可以调用 API 删除
    // await api.conversation.deleteConversation(conversationId)

    // 本地删除
    const index = conversationStore.conversationHistory.findIndex(
      conversation => conversation.id === conversationId
    )
    if (index !== -1) {
      conversationStore.conversationHistory.splice(index, 1)
      ElMessage.success('删除成功')
    }
  } catch {
    // 用户取消
  }
}

// 处理行点击
const handleRowClick = (row: any) => {
  selectedConversation.value = row
  drawerVisible.value = true
}

// 处理分页
const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
}

// 处理导出
const handleExport = (format: string) => {
  if (format === 'csv') {
    ElMessage.info('导出为 CSV 格式')
  } else {
    ElMessage.info('导出为 Excel 格式')
  }
}

onMounted(() => {
  // 如果没有历史数据，加载模拟数据
  if (conversationStore.conversationHistory.length === 0) {
    loadMockConversations()
  }
})

// 加载模拟历史数据
const loadMockConversations = () => {
  const positions = [
    '前端开发工程师',
    '后端开发工程师',
    '全栈工程师',
    '算法工程师'
  ]
  const difficulties = ['简单', '中等', '困难']

  for (let i = 0; i < 5; i++) {
    const startTime = Date.now() - i * 3 * 86400000 - Math.random() * 86400000
    const duration = (15 + Math.floor(Math.random() * 45)) * 60 * 1000
    const tech = +(3 + Math.random() * 2).toFixed(1)
    const comm = +(3 + Math.random() * 2).toFixed(1)
    const prob = +(3 + Math.random() * 2).toFixed(1)

    conversationStore.conversationHistory.push({
      id: `conversation_mock_${i}`,
      title: `${positions[i % positions.length]} - ${difficulties[i % 3]}难度`,
      startTime,
      endTime: startTime + duration,
      duration,
      status: i === 0 ? 'ongoing' : 'completed',
      score: i === 0 ? undefined : +((tech + comm + prob) / 3).toFixed(1),
      messages:
        i === 0
          ? [
              {
                id: 'm1',
                content: '你好！请先做一个自我介绍。',
                role: 'assistant',
                timestamp: startTime
              },
              {
                id: 'm2',
                content: '你好，我是一名前端工程师。',
                role: 'user',
                timestamp: startTime + 60000
              }
            ]
          : [],
      analysis:
        i === 0
          ? undefined
          : {
              technicalScore: tech,
              communicationScore: comm,
              problemSolvingScore: prob,
              overallScore: +((tech + comm + prob) / 3).toFixed(1),
              strengths: [
                '对核心技术概念有扎实的理解',
                '能够清晰地表达技术方案和思路',
                '具备良好的问题分析和解决能力'
              ],
              weaknesses: [
                '部分高级概念需要进一步深入学习',
                '系统设计经验有待积累'
              ],
              suggestions: [
                '建议多参与大型项目实践',
                '加强分布式系统和性能优化相关知识',
                '练习在白板上进行系统设计和算法推导'
              ]
            }
    })
  }
}
</script>

<style lang="scss" scoped>
.history-container {
  padding: 24px;

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;

    h2 {
      margin: 0;
      font-size: 24px;
      color: #303133;
    }
  }

  .stats-cards {
    margin-bottom: 24px;

    .stat-card {
      :deep(.el-card__body) {
        padding: 16px 20px;
      }

      .stat-content {
        display: flex;
        align-items: center;
        gap: 16px;

        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-info {
          flex: 1;

          .stat-label {
            margin: 0;
            font-size: 14px;
            color: #909399;
            margin-bottom: 4px;
          }

          .stat-value {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
            color: #303133;
          }
        }
      }
    }
  }

  .history-table-card {
    .table-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .table-actions {
        display: flex;
        gap: 12px;
      }
    }

    .session-title {
      display: flex;
      align-items: center;
      gap: 12px;

      .title-text {
        font-weight: 500;
      }
    }

    .no-score {
      color: #c0c4cc;
    }

    :deep(.el-table__row) {
      cursor: pointer;

      &:hover {
        background-color: #f5f7fa;
      }
    }

    .pagination-container {
      display: flex;
      justify-content: flex-end;
      margin-top: 24px;
    }
  }

  .drawer-content {
    height: 100%;
    display: flex;
    flex-direction: column;

    .drawer-header {
      padding: 20px 24px;
      border-bottom: 1px solid #ebeef5;
      display: flex;
      justify-content: space-between;
      align-items: center;

      h3 {
        margin: 0;
        font-size: 18px;
        color: #303133;
      }
    }

    .session-details {
      flex: 1;
      overflow-y: auto;
      padding: 24px;

      .details-section {
        margin-bottom: 20px;

        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;

          .el-icon {
            color: #409eff;
          }
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;

          .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;

            label {
              font-size: 14px;
              color: #909399;
            }

            span {
              font-size: 14px;
              color: #303133;
              font-weight: 500;
            }
          }
        }

        .message-history {
          .history-message {
            display: flex;
            gap: 12px;
            margin-bottom: 16px;
            padding: 12px;
            border-radius: 8px;
            background: #f8f9fb;

            &.assistant {
              .message-avatar {
                :deep(.el-avatar) {
                  background: #409eff;
                }
              }
            }

            &.user {
              flex-direction: row-reverse;

              .message-content {
                text-align: right;
              }
            }

            .message-content {
              flex: 1;

              .message-name {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;

                .message-time {
                  font-size: 12px;
                  color: #909399;
                }
              }

              .message-text {
                font-size: 14px;
                color: #303133;
                line-height: 1.6;
              }
            }
          }
        }

        .analysis-content {
          .score-card {
            .score-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 12px;

              h4 {
                margin: 0;
                font-size: 16px;
                color: #303133;
              }

              .score-value {
                font-size: 24px;
                font-weight: bold;
                color: #409eff;
              }
            }
          }

          .detailed-scores {
            h5 {
              margin: 0 0 16px 0;
              font-size: 16px;
              color: #303133;
            }

            .scores-grid {
              display: grid;
              gap: 16px;

              .score-item {
                label {
                  display: block;
                  margin-bottom: 8px;
                  font-size: 14px;
                  color: #606266;
                }
              }
            }
          }

          .strengths-weaknesses {
            h5 {
              margin: 0 0 12px 0;
              font-size: 16px;
              color: #303133;
            }

            ul {
              margin: 0;
              padding-left: 20px;

              li {
                margin-bottom: 8px;
                color: #606266;
                line-height: 1.6;
              }
            }
          }
        }
      }
    }
  }
}

html[data-theme='dark'] .history-container {
  background: #121417;
}

html[data-theme='dark'] .history-container .history-header h2 {
  color: #e7ecf3;
}

html[data-theme='dark'] .history-container .stat-card,
html[data-theme='dark'] .history-container .history-table-card,
html[data-theme='dark'] .history-container .details-section {
  background: #1b1f24;
  border-color: #2c323a;
}

html[data-theme='dark'] .history-container .stat-info .stat-value,
html[data-theme='dark'] .history-container .section-header span,
html[data-theme='dark'] .history-container .info-item span,
html[data-theme='dark'] .history-container .message-text {
  color: #e7ecf3;
}

html[data-theme='dark'] .history-container :deep(.el-table),
html[data-theme='dark'] .history-container :deep(.el-table__inner-wrapper),
html[data-theme='dark'] .history-container :deep(.el-table tr),
html[data-theme='dark'] .history-container :deep(.el-table th.el-table__cell),
html[data-theme='dark'] .history-container :deep(.el-table td.el-table__cell) {
  background: #1b1f24 !important;
  color: #e7ecf3 !important;
  border-color: #2c323a !important;
}

html[data-theme='dark'] .history-container :deep(.el-table__row:hover > td) {
  background: #232933 !important;
}

html[data-theme='dark'] .history-container :deep(.el-drawer),
html[data-theme='dark'] .history-container :deep(.el-drawer__body),
html[data-theme='dark'] .history-container .drawer-content {
  background: #161a1f !important;
  color: #e7ecf3;
}

@media (max-width: 1024px) {
  .history-container {
    padding: 14px;

    .stats-row {
      :deep(.el-col) {
        margin-bottom: 12px;
      }
    }
  }
}

@media (max-width: 768px) {
  .history-container {
    .history-header {
      flex-direction: column;
      align-items: stretch;
      gap: 10px;
    }

    .history-table-card {
      .table-header {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;

        .table-actions {
          justify-content: space-between;
          flex-wrap: wrap;
        }
      }
    }

    .drawer-content {
      .session-details {
        padding: 14px;

        .details-section .info-grid {
          grid-template-columns: 1fr;
        }
      }
    }
  }
}
</style>
