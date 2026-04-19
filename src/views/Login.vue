<template>
  <div class="login-container">
    <div class="login-shell">
      <div class="login-visual">
        <div class="hero-badges">
          <span>direct</span>
          <span>memory</span>
          <span>voice</span>
        </div>
        <h1 class="login-title">AI 对话助手</h1>
        <p class="login-subtitle">更像社交应用的轻盈对话体验，专注聊天、记忆与知识库。</p>
        <div class="hero-card-row">
          <div class="mini-card"><span>24h</span><small>在线回复</small></div>
          <div class="mini-card"><span>RAG</span><small>引用追溯</small></div>
          <div class="mini-card"><span>Voice</span><small>语音输入</small></div>
        </div>
      </div>

      <div class="login-content">
        <div class="login-card">
          <div class="login-header">
            <div class="avatar-ring">
              <span class="avatar-dot"></span>
            </div>
            <h2 class="panel-title">欢迎回来</h2>
            <p class="panel-subtitle">登录后继续你的对话</p>
          </div>

          <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" class="login-form" @submit.prevent="handleLogin">
            <el-form-item prop="username">
              <el-input v-model="loginForm.username" placeholder="用户名" size="large" clearable />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="loginForm.password" type="password" placeholder="密码" size="large" show-password @keyup.enter="handleLogin" />
            </el-form-item>
            <div class="form-row">
              <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
              <button class="text-link" type="button" @click="handleRegister">立即注册</button>
            </div>
            <el-form-item>
              <el-button type="primary" size="large" :loading="loading" class="login-button" @click="handleLogin">
                {{ loading ? '登录中...' : '登 录' }}
              </el-button>
            </el-form-item>
          </el-form>

          <div class="demo-accounts">
            <el-divider content-position="center">演示账号</el-divider>
            <div class="demo-buttons">
              <el-button size="small" @click="useDemoAccount('admin')">管理员</el-button>
              <el-button size="small" @click="useDemoAccount('user')">普通用户</el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="registerDialogVisible" title="用户注册" width="450px" :close-on-click-modal="false">
      <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" label-width="80px">
        <el-form-item label="用户名" prop="username"><el-input v-model="registerForm.username" placeholder="请输入用户名" /></el-form-item>
        <el-form-item label="邮箱" prop="email"><el-input v-model="registerForm.email" placeholder="请输入邮箱" /></el-form-item>
        <el-form-item label="密码" prop="password"><el-input v-model="registerForm.password" type="password" placeholder="请输入密码" show-password /></el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword"><el-input v-model="registerForm.confirmPassword" type="password" placeholder="请再次输入密码" show-password /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="registerDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="registerLoading" @click="handleRegisterSubmit">注册</el-button>
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
const loginForm = reactive({ username: '', password: '', remember: false })
const registerForm = reactive({ username: '', email: '', password: '', confirmPassword: '' })
const loginRules = { username: [{ required: true, message: '请输入用户名', trigger: 'blur' }, { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' }], password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, max: 30, message: '密码长度至少6个字符', trigger: 'blur' }] }
const registerRules = { username: [{ required: true, message: '请输入用户名', trigger: 'blur' }, { min: 3, max: 20, message: '用户名长度为3-20个字符', trigger: 'blur' }], email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }, { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }], password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, max: 30, message: '密码长度至少6个字符', trigger: 'blur' }], confirmPassword: [{ required: true, message: '请再次输入密码', trigger: 'blur' }, { validator: (_: any, value: string, callback: any) => { value !== registerForm.password ? callback(new Error('两次输入的密码不一致')) : callback() }, trigger: 'blur' }] }
const handleLogin = async () => { if (!loginFormRef.value) return; await loginFormRef.value.validate(async (valid: boolean) => { if (valid) { loading.value = true; try { const response = await api.auth.login(loginForm.username, loginForm.password); if (response.code === 200 || response.success) { if (loginForm.remember) localStorage.setItem('token', response.data.token); else sessionStorage.setItem('token', response.data.token); userStore.setToken(response.data.token); userStore.setUserInfo(response.data.userInfo); ElMessage.success(response.message || '登录成功'); router.push('/'); } else ElMessage.error(response.message || '登录失败') } catch (error: any) { ElMessage.error(error.message || '登录失败，请检查用户名和密码') } finally { loading.value = false } } }) }
const handleRegister = () => { registerDialogVisible.value = true }
const handleRegisterSubmit = async () => { if (!registerFormRef.value) return; await registerFormRef.value.validate(async (valid: boolean) => { if (valid) { registerLoading.value = true; try { const response = await api.auth.register({ username: registerForm.username, email: registerForm.email, password: registerForm.password }); if (response.code === 200 || response.success) { const username = registerForm.username; const password = registerForm.password; ElMessage.success('注册成功，请登录'); registerDialogVisible.value = false; registerFormRef.value.resetFields(); loginForm.username = username; loginForm.password = password; } else ElMessage.error(response.message || '注册失败') } catch (error: any) { ElMessage.error(error.message || '注册失败') } finally { registerLoading.value = false } } }) }
const useDemoAccount = (type: string) => { if (type === 'admin') { loginForm.username = 'admin'; loginForm.password = '123456' } else { loginForm.username = 'user'; loginForm.password = '123456' } }
</script>

<style lang="scss" scoped>
.login-container { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: radial-gradient(circle at top left, rgba(255,255,255,.62), transparent 32%), radial-gradient(circle at bottom right, rgba(244,216,210,.38), transparent 28%), linear-gradient(180deg, #fbf8f3 0%, #f1ebe2 100%); }
.login-shell { width: min(1160px, 100%); display: grid; grid-template-columns: 1.08fr .92fr; gap: 32px; align-items: center; }
.login-visual { color: #262626; padding: 22px; }
.hero-badges { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
.hero-badges span { padding: 7px 12px; border-radius: 999px; background: rgba(255,255,255,.72); border: 1px solid rgba(0,0,0,.06); font-size: 12px; color: #8e8e8e; letter-spacing: .06em; text-transform: uppercase; }
.login-title { font-size: clamp(42px, 6vw, 68px); line-height: .96; margin: 0 0 14px; letter-spacing: -0.06em; }
.login-subtitle { max-width: 560px; font-size: 18px; line-height: 1.75; color: #6f6f6f; }
.hero-card-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 26px; max-width: 560px; }
.mini-card { border-radius: 22px; padding: 16px 18px; background: rgba(255,255,255,.72); border: 1px solid rgba(0,0,0,.06); box-shadow: 0 12px 30px rgba(0,0,0,.05); }
.mini-card span { display: block; font-size: 18px; font-weight: 700; color: #262626; }
.mini-card small { display: block; margin-top: 6px; color: #8e8e8e; }
.login-card { background: rgba(255,255,255,.82); border: 1px solid rgba(255,255,255,.72); border-radius: 30px; padding: 34px; box-shadow: 0 20px 50px rgba(0,0,0,.08); backdrop-filter: blur(18px); }
.login-header { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; margin-bottom: 22px; }
.avatar-ring { width: 52px; height: 52px; border-radius: 50%; padding: 3px; background: linear-gradient(135deg, rgba(137,169,155,.7), rgba(244,216,210,.8)); }
.avatar-dot { display: block; width: 100%; height: 100%; border-radius: 50%; background: rgba(255,255,255,.9); }
.panel-title { margin: 0; font-size: 26px; color: #262626; }
.panel-subtitle { margin: 0; color: #8e8e8e; }
.login-form :deep(.el-form-item) { margin-bottom: 16px; }
.login-form :deep(.el-input__wrapper) { border-radius: 18px; padding: 10px 14px; background: rgba(250,250,250,.92); box-shadow: none; border: 1px solid #efe5db; }
.login-form :deep(.el-input__wrapper.is-focus) { border-color: #cfc4b8; box-shadow: 0 0 0 3px rgba(137,169,155,.12); }
.form-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 4px 0 8px; }
.text-link { border: none; background: transparent; color: #262626; font-weight: 600; padding: 0; cursor: pointer; }
.login-button { width: 100%; height: 48px; border-radius: 18px; border: none; background: #89a99b; color: #fff; font-weight: 600; box-shadow: 0 14px 24px rgba(137,169,155,.2); }
.login-button:hover { opacity: .96; }
.login-footer { text-align: center; margin-top: 16px; }
.login-footer p { color: #8e8e8e; font-size: 13px; }
.login-footer a { color: #262626; text-decoration: none; font-weight: 600; }
.demo-accounts { margin-top: 22px; }
.demo-buttons { display: flex; justify-content: center; gap: 12px; }
.demo-buttons :deep(.el-button) { border-radius: 999px; }
@media (max-width: 900px) { .login-shell { grid-template-columns: 1fr; } .hero-card-row { grid-template-columns: 1fr; } }
</style>
