<template>
  <div class="main-layout">
    <el-header class="layout-header">
      <div class="header-left">
        <h1 class="logo">{{ preferenceStore.t('appName') }}</h1>
        <button class="chat-nav" type="button" @click="goChat">
          <el-icon><ChatLineRound /></el-icon>
          <span>对话</span>
        </button>
      </div>

      <div class="header-right">
        <div class="user-info">
          <el-avatar :size="32" :src="userStore.userInfo?.avatar" />
          <span class="username">{{ userStore.userInfo?.username }}</span>
        </div>
        <el-button class="logout-btn" text @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          <span>退出</span>
        </el-button>
      </div>
    </el-header>

    <div class="layout-content"><router-view /></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore, usePreferenceStore } from '@/store'
import { api } from '@/service/api'
import { ChatLineRound, SwitchButton } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const preferenceStore = usePreferenceStore()

const goChat = () => router.push('/chat')
const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

const refreshUserProfile = async () => {
  if (!userStore.isLoggedIn) return
  try {
    const result = await api.user.getProfile()
    const p = result.data
    if (!p) return
    userStore.setUserInfo({
      id: p.id || 0,
      username: p.username || '',
      email: p.email || '',
      avatar: p.avatar || '',
      role: (p.role as 'admin' | 'user') || 'user',
    })
  } catch {}
}

onMounted(refreshUserProfile)
</script>

<style scoped lang="scss">
.main-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #faf7f2 0%, #f1ece4 100%);
}
.layout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(18px);
}
.header-left {
  display: flex;
  align-items: center;
  gap: 18px;
}
.logo {
  color: #262626;
  margin: 0;
  font-size: 36px;
  font-weight: 700;
  letter-spacing: -0.03em;
}
.chat-nav {
  height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid #e8e4dd;
  background: #fff;
  color: #262626;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.chat-nav:hover {
  background: #f7f3ed;
}
.layout-content {
  flex: 1;
  padding: 16px;
  overflow: auto;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}
.username {
  color: #262626;
  font-weight: 600;
}
.logout-btn {
  border-radius: 999px;
  color: #8e8e8e;
}
.logout-btn:hover {
  color: #262626;
  background: #f4efe8;
}
</style>
