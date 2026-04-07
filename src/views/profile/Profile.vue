<template>
  <div class="profile-container">
    <!-- 用户信息卡片 -->
    <el-row :gutter="20">
      <el-col :span="8">
        <el-card class="user-card">
          <div class="user-info">
            <div class="avatar-section">
              <el-avatar
                :size="100"
                :src="userInfo.avatar"
                class="user-avatar"
              />
              <div class="avatar-actions">
                <el-upload
                  :action="avatarUploadAction"
                  :headers="uploadHeaders"
                  :show-file-list="false"
                  :on-success="handleAvatarSuccess"
                  :before-upload="beforeAvatarUpload"
                >
                  <el-button type="primary" size="small">
                    <el-icon><Upload /></el-icon>
                    更换头像
                  </el-button>
                </el-upload>
                <el-button size="small" @click="resetAvatar">
                  <el-icon><Refresh /></el-icon>
                  重置
                </el-button>
              </div>
            </div>

            <div class="user-details">
              <h3>{{ userInfo.username }}</h3>
              <p class="user-email">
                <el-icon><Message /></el-icon>
                {{ userInfo.email }}
              </p>
              <p class="user-role">
                <el-tag
                  :type="userInfo.role === 'admin' ? 'danger' : 'success'"
                >
                  {{ userInfo.role === 'admin' ? '管理员' : '普通用户' }}
                </el-tag>
              </p>
              <p class="user-join">
                <el-icon><Calendar /></el-icon>
                加入于 {{ formatDate(userInfo.createdAt) }}
              </p>
              <p class="user-last-login">
                <el-icon><Clock /></el-icon>
                上次登录 {{ formatRelativeTime(userInfo.lastLoginAt) }}
              </p>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="16">
        <el-card class="stats-card">
          <template #header>
            <div class="card-header">
              <span>个人统计</span>
              <el-button type="text" @click="refreshStats">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
          </template>

          <el-row :gutter="20">
            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-icon" style="background: #ecf5ff">
                  <el-icon color="#409eff" :size="24"
                    ><ChatLineRound
                  /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ userStats.totalInterviews }}</div>
                  <div class="stat-label">总面试次数</div>
                </div>
              </div>
            </el-col>

            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-icon" style="background: #f0f9eb">
                  <el-icon color="#67c23a" :size="24"><Check /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">
                    {{ userStats.completedInterviews }}
                  </div>
                  <div class="stat-label">完成面试</div>
                </div>
              </div>
            </el-col>

            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-icon" style="background: #fef0f0">
                  <el-icon color="#f56c6c" :size="24"><TrendCharts /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">
                    {{ userStats.averageScore.toFixed(1) }}
                  </div>
                  <div class="stat-label">平均分数</div>
                </div>
              </div>
            </el-col>

            <el-col :span="6">
              <div class="stat-item">
                <div class="stat-icon" style="background: #f4f4f5">
                  <el-icon color="#909399" :size="24"><Timer /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">
                    {{ formatDuration(userStats.totalDuration) }}
                  </div>
                  <div class="stat-label">总时长</div>
                </div>
              </div>
            </el-col>
          </el-row>

          <el-divider />

          <div class="progress-stats">
            <div class="progress-item">
              <div class="progress-label">技术水平</div>
              <el-progress
                :percentage="calculateProgress('technical')"
                :color="getProgressColor('technical')"
              />
            </div>

            <div class="progress-item">
              <div class="progress-label">沟通能力</div>
              <el-progress
                :percentage="calculateProgress('communication')"
                :color="getProgressColor('communication')"
              />
            </div>

            <div class="progress-item">
              <div class="progress-label">问题解决</div>
              <el-progress
                :percentage="calculateProgress('problemSolving')"
                :color="getProgressColor('problemSolving')"
              />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 设置表单 -->
    <el-row :gutter="20" class="mt-20">
      <el-col :span="16">
        <el-card class="settings-card">
          <template #header>
            <span>个人信息设置</span>
          </template>

          <el-form
            ref="profileFormRef"
            :model="profileForm"
            :rules="profileRules"
            label-width="100px"
          >
            <el-form-item label="用户名" prop="username">
              <el-input
                v-model="profileForm.username"
                placeholder="请输入用户名"
              />
            </el-form-item>

            <el-form-item label="邮箱" prop="email">
              <el-input v-model="profileForm.email" placeholder="请输入邮箱" />
            </el-form-item>

            <el-form-item label="个人简介" prop="bio">
              <el-input
                v-model="profileForm.bio"
                type="textarea"
                :rows="3"
                placeholder="简单介绍一下自己..."
                maxlength="200"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="工作状态" prop="status">
              <el-select
                v-model="profileForm.status"
                placeholder="请选择工作状态"
              >
                <el-option label="在职" value="employed" />
                <el-option label="求职中" value="job-seeking" />
                <el-option label="学生" value="student" />
                <el-option label="自由职业" value="freelancer" />
              </el-select>
            </el-form-item>

            <el-form-item label="技术栈" prop="skills">
              <el-select
                v-model="profileForm.skills"
                multiple
                placeholder="请选择技术栈"
                style="width: 100%"
              >
                <el-option label="Vue.js" value="vue" />
                <el-option label="React" value="react" />
                <el-option label="TypeScript" value="typescript" />
                <el-option label="Node.js" value="nodejs" />
                <el-option label="Python" value="python" />
                <el-option label="Java" value="java" />
                <el-option label="Go" value="go" />
                <el-option label="Docker" value="docker" />
                <el-option label="Kubernetes" value="kubernetes" />
              </el-select>
            </el-form-item>

            <el-form-item label="通知设置">
              <el-checkbox-group v-model="profileForm.notifications">
                <el-checkbox label="email">邮件通知</el-checkbox>
                <el-checkbox label="push">推送通知</el-checkbox>
                <el-checkbox label="sms">短信通知</el-checkbox>
              </el-checkbox-group>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" :loading="saving" @click="saveProfile">
                保存设置
              </el-button>
              <el-button @click="resetProfile">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card class="security-card">
          <template #header>
            <span>账户安全</span>
          </template>

          <div class="security-actions">
            <el-button type="primary" @click="changePassword">
              <el-icon><Lock /></el-icon>
              修改密码
            </el-button>

            <el-button @click="manageDevices">
              <el-icon><Monitor /></el-icon>
              设备管理
            </el-button>

            <el-button @click="viewActivityLog">
              <el-icon><Document /></el-icon>
              活动日志
            </el-button>

            <el-divider />

            <div class="security-info">
              <h4>安全状态</h4>
              <el-alert
                :type="getSecurityLevel().type"
                :title="getSecurityLevel().title"
                :description="getSecurityLevel().description"
                show-icon
                :closable="false"
              />
            </div>

            <el-divider />

            <div class="danger-zone">
              <h4>危险操作</h4>
              <p class="danger-hint">这些操作可能会影响您的账户安全</p>

              <el-button type="danger" plain @click="logoutAllDevices">
                <el-icon><SwitchButton /></el-icon>
                退出所有设备
              </el-button>

              <el-button type="danger" @click="deleteAccount">
                <el-icon><Delete /></el-icon>
                删除账户
              </el-button>
            </div>
          </div>
        </el-card>

        <el-card class="preference-card mt-20">
          <template #header>
            <span>偏好设置</span>
          </template>

          <div class="preference-settings">
            <div class="preference-item">
              <span>主题模式</span>
              <el-switch
                v-model="theme.darkMode"
                active-text="暗黑"
                inactive-text="明亮"
                @change="toggleTheme"
              />
            </div>

            <div class="preference-item">
              <span>语言设置</span>
              <el-select
                v-model="theme.language"
                size="small"
                @change="changeLanguage"
              >
                <el-option label="中文" value="zh-CN" />
                <el-option label="English" value="en-US" />
              </el-select>
            </div>

            <div class="preference-item">
              <span>动画效果</span>
              <el-switch v-model="theme.animations" />
            </div>

            <div class="preference-item">
              <span>声音提示</span>
              <el-switch v-model="theme.sounds" />
            </div>

            <div class="preference-item">
              <span>自动保存</span>
              <el-switch v-model="theme.autoSave" />
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 修改密码对话框 -->
    <el-dialog
      v-model="passwordDialogVisible"
      title="修改密码"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="80px"
      >
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input
            v-model="passwordForm.currentPassword"
            type="password"
            show-password
          />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            show-password
          />
          <div class="password-strength">
            密码强度：
            <span :style="{ color: passwordStrength.color }">
              {{ passwordStrength.message }}
            </span>
          </div>
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="passwordDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="changingPassword"
          @click="submitPasswordChange"
        >
          确认修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store'
import { ElMessage, ElMessageBox } from 'element-plus'
import { api } from '@/service/api'

const router = useRouter()
const userStore = useUserStore()

const avatarUploadAction = computed(() => api.upload.getAvatarUploadUrl())
const uploadHeaders = computed<Record<string, string>>(() => {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
})

// 表单引用
const profileFormRef = ref()
const passwordFormRef = ref()

// 状态变量
const saving = ref(false)
const changingPassword = ref(false)
const passwordDialogVisible = ref(false)

// 用户信息
const userInfo = reactive({
  id: 1,
  username: '测试用户',
  email: 'test@example.com',
  avatar: 'https://picsum.photos/200',
  role: 'user' as 'admin' | 'user',
  createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
  lastLoginAt: Date.now(),
  status: 'active' as 'active' | 'inactive' | 'banned'
})

// 用户统计
const userStats = reactive({
  totalInterviews: 15,
  completedInterviews: 12,
  averageScore: 4.2,
  bestScore: 4.8,
  worstScore: 3.5,
  totalDuration: 12 * 60 * 60 * 1000, // 12小时
  dailyAverage: 25, // 分钟
  improvementRate: 15 // 百分比
})

// 个人资料表单
const profileForm = reactive({
  username: '测试用户',
  email: 'test@example.com',
  bio: '前端工程师，热爱学习和分享技术。',
  status: 'employed',
  skills: ['vue', 'typescript', 'nodejs'],
  notifications: ['email', 'push']
})

// 修改密码表单
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 主题设置
const theme = reactive({
  darkMode: false,
  language: 'zh-CN',
  animations: true,
  sounds: true,
  autoSave: true
})

// 表单验证规则
const profileRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  status: [{ required: true, message: '请选择工作状态', trigger: 'change' }]
}

const passwordRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: any) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 计算属性
const passwordStrength = computed(() => {
  const password = passwordForm.newPassword
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
})

// 格式化函数
const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const formatRelativeTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 60) {
    return `${minutes} 分钟前`
  } else if (hours < 24) {
    return `${hours} 小时前`
  } else if (days < 30) {
    return `${days} 天前`
  } else {
    return formatDate(timestamp)
  }
}

const formatDuration = (ms: number) => {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  return `${hours} 小时`
}

// 进度计算
const calculateProgress = (type: string) => {
  const baseScore =
    type === 'technical' ? 4.5 : type === 'communication' ? 4.0 : 4.2
  const progress = (baseScore / 5) * 100
  return Math.min(Math.round(progress), 100)
}

const getProgressColor = (type: string) => {
  const progress = calculateProgress(type)
  if (progress >= 80) return '#67c23a'
  if (progress >= 60) return '#e6a23c'
  if (progress >= 40) return '#409eff'
  return '#f56c6c'
}

// 安全等级评估
const getSecurityLevel = () => {
  const hasStrongPassword = passwordStrength.value.level >= 3
  const hasEmail = userInfo.email.includes('@')
  const recentLogin =
    Date.now() - userInfo.lastLoginAt < 7 * 24 * 60 * 60 * 1000

  if (hasStrongPassword && hasEmail && recentLogin) {
    return {
      type: 'success' as const,
      title: '安全等级：高',
      description: '您的账户安全状态良好'
    }
  } else if (hasStrongPassword && hasEmail) {
    return {
      type: 'warning' as const,
      title: '安全等级：中',
      description: '建议最近登录并启用双重验证'
    }
  } else {
    return {
      type: 'error' as const,
      title: '安全等级：低',
      description: '建议加强密码并绑定邮箱'
    }
  }
}

// 头像上传处理
const handleAvatarSuccess = (response: any) => {
  if (response.code === 200) {
    userInfo.avatar = response.data.url
    ElMessage.success('头像上传成功')
  }
}

const beforeAvatarUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件！')
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB！')
  }

  return isImage && isLt2M
}

const resetAvatar = () => {
  userInfo.avatar = 'https://picsum.photos/200'
  ElMessage.info('头像已重置')
}

// 个人资料操作
const saveProfile = async () => {
  if (!profileFormRef.value) return

  await profileFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      saving.value = true
      try {
        // 这里调用 API 保存个人资料
        // await api.user.updateProfile(profileForm)

        // 更新用户信息
        userInfo.username = profileForm.username
        userInfo.email = profileForm.email

        ElMessage.success('个人资料保存成功')
      } catch (error) {
        console.error('保存失败:', error)
        ElMessage.error('保存失败，请重试')
      } finally {
        saving.value = false
      }
    }
  })
}

const resetProfile = () => {
  profileFormRef.value?.resetFields()
  ElMessage.info('表单已重置')
}

// 密码操作
const changePassword = () => {
  passwordDialogVisible.value = true
}

const submitPasswordChange = async () => {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      changingPassword.value = true
      try {
        // 这里调用 API 修改密码
        // await api.user.changePassword(passwordForm)

        ElMessage.success('密码修改成功')
        passwordDialogVisible.value = false
        passwordFormRef.value?.resetFields()
      } catch (error) {
        console.error('修改失败:', error)
        ElMessage.error('密码修改失败，请检查当前密码是否正确')
      } finally {
        changingPassword.value = false
      }
    }
  })
}

// 其他操作
const refreshStats = () => {
  ElMessage.success('统计数据已刷新')
}

const manageDevices = () => {
  ElMessage.info('设备管理功能开发中...')
}

const viewActivityLog = () => {
  ElMessage.info('活动日志功能开发中...')
}

const logoutAllDevices = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要退出所有设备吗？这将会使所有已登录的设备退出登录。',
      '退出所有设备',
      {
        confirmButtonText: '确定退出',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 这里调用 API 退出所有设备
    // await api.auth.logoutAll()

    ElMessage.success('已退出所有设备')
  } catch {
    // 用户取消
  }
}

const deleteAccount = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要删除账户吗？此操作不可恢复，所有数据将被永久删除。',
      '删除账户',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
        inputPlaceholder: '请输入 DELETE 确认删除'
      }
    )

    ElMessage.warning('账户删除功能需要进一步验证')
  } catch {
    // 用户取消
  }
}

// 主题和语言
const toggleTheme = () => {
  ElMessage.success(`已切换到${theme.darkMode ? '暗黑' : '明亮'}主题`)
}

const changeLanguage = () => {
  ElMessage.success(
    `语言已切换到${theme.language === 'zh-CN' ? '中文' : '英文'}`
  )
}

// 初始化
onMounted(() => {
  // 从 store 加载用户信息
  const user = userStore.userInfo
  if (user) {
    userInfo.id = user.id
    userInfo.username = user.username
    userInfo.email = user.email
    userInfo.avatar = user.avatar
    userInfo.role = user.role as 'admin' | 'user'
    profileForm.username = user.username
    profileForm.email = user.email
  }
})

// 加载用户统计
const loadUserStats = async () => {
  try {
    // 这里调用 API 获取用户统计
    // const stats = await api.user.getStats()
    // Object.assign(userStats, stats)
  } catch (error) {
    console.error('加载统计失败:', error)
  }
}
</script>

<style lang="scss" scoped>
.profile-container {
  padding: 24px;

  .mt-20 {
    margin-top: 20px;
  }

  .user-card {
    .user-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;

      .avatar-section {
        position: relative;
        margin-bottom: 20px;

        .user-avatar {
          border: 4px solid var(--color-border-lighter);
          transition: transform 0.3s;

          &:hover {
            transform: scale(1.05);
          }
        }

        .avatar-actions {
          margin-top: 12px;
          display: flex;
          gap: 8px;
          justify-content: center;
        }
      }

      .user-details {
        h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          color: var(--color-text-primary);
        }

        .user-email,
        .user-join,
        .user-last-login {
          margin: 8px 0;
          color: var(--color-text-secondary);
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;

          .el-icon {
            font-size: 16px;
          }
        }

        .user-role {
          margin: 12px 0;
        }
      }
    }
  }

  .stats-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px;
      background: var(--color-bg-tertiary);
      border-radius: 8px;

      .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .stat-info {
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: var(--color-text-primary);
          line-height: 1;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 14px;
          color: var(--color-text-secondary);
        }
      }
    }

    .progress-stats {
      .progress-item {
        margin-bottom: 16px;

        &:last-child {
          margin-bottom: 0;
        }

        .progress-label {
          margin-bottom: 8px;
          font-size: 14px;
          color: var(--color-text-secondary);
          font-weight: 500;
        }
      }
    }
  }

  .settings-card {
    :deep(.el-form-item) {
      margin-bottom: 20px;
    }

    :deep(.el-select) {
      width: 100%;
    }
  }

  .security-card {
    .security-actions {
      .el-button {
        width: 100%;
        margin-bottom: 12px;

        &:last-child {
          margin-bottom: 0;
        }
      }

      .security-info {
        margin-bottom: 16px;

        h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          color: var(--color-text-primary);
        }
      }

      .danger-zone {
        h4 {
          margin: 0 0 8px 0;
          font-size: 16px;
          color: var(--color-text-primary);
        }

        .danger-hint {
          margin: 0 0 16px 0;
          font-size: 14px;
          color: var(--color-text-secondary);
        }

        .el-button {
          width: 100%;
          margin-bottom: 12px;

          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }
  }

  .preference-card {
    .preference-settings {
      .preference-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid var(--color-border-lighter);

        &:last-child {
          border-bottom: none;
        }

        span {
          font-size: 14px;
          color: var(--color-text-primary);
          font-weight: 500;
        }

        .el-switch {
          transform: scale(0.9);
        }

        .el-select {
          width: 120px;
        }
      }
    }
  }
}

.password-strength {
  font-size: 12px;
  margin-top: 4px;
  color: var(--color-text-secondary);
}
</style>
