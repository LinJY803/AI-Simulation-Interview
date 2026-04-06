<template>
  <div class="login-container">
    <div class="login-background">
      <div class="background-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
      </div>
    </div>

    <div class="login-content">
      <div class="login-card">
        <div class="login-header">
          <h1 class="login-title">AI 面试系统</h1>
          <p class="login-subtitle">智能面试助手，提升你的面试技能</p>
        </div>

        <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="loginRules"
          class="login-form"
          @submit.prevent="handleLogin"
        >
          <el-form-item prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="请输入用户名"
              size="large"
              prefix-icon="User"
              clearable
            />
          </el-form-item>

          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              prefix-icon="Lock"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-form-item prop="remember">
            <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
            <a href="#" class="forgot-link">忘记密码？</a>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              class="login-button"
              @click="handleLogin"
            >
              {{ loading ? '登录中...' : '登 录' }}
            </el-button>
          </el-form-item>
        </el-form>

        <div class="login-footer">
          <p>
            还没有账号？
            <a href="#" @click.prevent="handleRegister">立即注册</a>
          </p>
        </div>

        <div class="demo-accounts">
          <el-divider content-position="center">演示账号</el-divider>
          <div class="demo-buttons">
            <el-button size="small" @click="useDemoAccount('admin')">管理员</el-button>
            <el-button size="small" @click="useDemoAccount('user')">普通用户</el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 注册对话框 -->
    <el-dialog
      v-model="registerDialogVisible"
      title="用户注册"
      width="450px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="registerForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="registerForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="registerDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="registerLoading" @click="handleRegisterSubmit">
          注册
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store'
import { api } from '@/service/api'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const loginFormRef = ref()
const registerFormRef = ref()
const loading = ref(false)
const registerLoading = ref(false)
const registerDialogVisible = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
  remember: false
})

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// 登录表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 30, message: '密码长度至少6个字符', trigger: 'blur' }
  ]
}

// 注册表单验证规则
const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 30, message: '密码长度至少6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: any) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 处理登录
const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const response = await api.auth.login(loginForm.username, loginForm.password)
        
        if (response.code === 200 || response.success) {
          userStore.setToken(response.data.token)
          userStore.setUserInfo(response.data.userInfo)
          ElMessage.success('登录成功')
          router.push('/')
        } else {
          ElMessage.error(response.message || '登录失败')
        }
      } catch (error: any) {
        ElMessage.error(error.message || '登录失败，请检查用户名和密码')
      } finally {
        loading.value = false
      }
    }
  })
}

// 处理注册
const handleRegister = () => {
  registerDialogVisible.value = true
}

// 提交注册
const handleRegisterSubmit = async () => {
  if (!registerFormRef.value) return

  await registerFormRef.value.validate(async (valid) => {
    if (valid) {
      registerLoading.value = true
      try {
        const response = await api.auth.register({
          username: registerForm.username,
          email: registerForm.email,
          password: registerForm.password
        })

        if (response.code === 200 || response.success) {
          ElMessage.success('注册成功，请登录')
          registerDialogVisible.value = false
          // 清空表单
          registerFormRef.value.resetFields()
          // 自动填充用户名
          loginForm.username = registerForm.username
        } else {
          ElMessage.error(response.message || '注册失败')
        }
      } catch (error: any) {
        ElMessage.error(error.message || '注册失败')
      } finally {
        registerLoading.value = false
      }
    }
  })
}

// 使用演示账号
const useDemoAccount = (type: string) => {
  if (type === 'admin') {
    loginForm.username = 'admin'
    loginForm.password = 'admin123'
  } else {
    loginForm.username = 'user'
    loginForm.password = 'user123'
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;

  .login-background {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: hidden;

    .background-shapes {
      .shape {
        position: absolute;
        border-radius: 50%;
        opacity: 0.1;
        animation: float 20s infinite ease-in-out;

        &.shape-1 {
          width: 400px;
          height: 400px;
          background: white;
          top: -100px;
          left: -100px;
          animation-delay: 0s;
        }

        &.shape-2 {
          width: 300px;
          height: 300px;
          background: white;
          bottom: -50px;
          right: -50px;
          animation-delay: -5s;
        }

        &.shape-3 {
          width: 200px;
          height: 200px;
          background: white;
          top: 50%;
          left: 80%;
          animation-delay: -10s;
        }
      }
    }
  }

  .login-content {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 420px;
    padding: 20px;

    .login-card {
      background: white;
      border-radius: 20px;
      padding: 48px 40px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);

      .login-header {
        text-align: center;
        margin-bottom: 40px;

        .login-title {
          font-size: 28px;
          font-weight: bold;
          color: #333;
          margin-bottom: 12px;
        }

        .login-subtitle {
          font-size: 14px;
          color: #909399;
        }
      }

      .login-form {
        :deep(.el-form-item) {
          margin-bottom: 24px;
        }

        :deep(.el-input) {
          .el-input__wrapper {
            padding: 12px 16px;
            border-radius: 8px;
          }
        }

        .forgot-link {
          color: #409eff;
          text-decoration: none;
          font-size: 14px;
          margin-left: auto;

          &:hover {
            text-decoration: underline;
          }
        }

        .login-button {
          width: 100%;
          height: 48px;
          font-size: 16px;
          border-radius: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;

          &:hover {
            opacity: 0.9;
          }
        }
      }

      .login-footer {
        text-align: center;
        margin-top: 24px;

        p {
          color: #909399;
          font-size: 14px;

          a {
            color: #409eff;
            text-decoration: none;
            font-weight: 500;

            &:hover {
              text-decoration: underline;
            }
          }
        }
      }

      .demo-accounts {
        margin-top: 32px;

        :deep(.el-divider) {
          margin: 16px 0;
        }

        .demo-buttons {
          display: flex;
          justify-content: center;
          gap: 16px;
        }
      }
    }
  }
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) rotate(0deg);
  }
  25% {
    transform: translate(50px, 50px) rotate(90deg);
  }
  50% {
    transform: translate(0, 100px) rotate(180deg);
  }
  75% {
    transform: translate(-50px, 50px) rotate(270deg);
  }
}
</style>
