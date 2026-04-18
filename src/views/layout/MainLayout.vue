<template>
  <div class="main-layout">
    <el-header class="layout-header">
      <div class="header-left">
        <h1 class="logo">{{ preferenceStore.t('appName') }}</h1>
        <el-menu :default-active="activeMenu" mode="horizontal" class="header-menu" @select="handleMenuSelect">
          <el-menu-item index="/chat">
            <el-icon><ChatLineRound /></el-icon>
            <span>对话</span>
          </el-menu-item>
          <el-menu-item index="/history">
            <span>历史</span>
          </el-menu-item>
        </el-menu>
      </div>

      <div class="header-right">
        <el-dropdown @command="handleUserCommand">
          <div class="user-info">
            <el-avatar :size="32" :src="userStore.userInfo?.avatar" />
            <span class="username">{{ userStore.userInfo?.username }}</span>
            <span class="menu-label">{{ userMenuLabel }}</span>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>
                个人中心
              </el-dropdown-item>
              <el-dropdown-item divided command="logout">
                <el-icon><SwitchButton /></el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <div class="layout-content"><router-view /></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore, usePreferenceStore } from '@/store'
import { api } from '@/service/api'
import { ChatLineRound, User, SwitchButton } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const preferenceStore = usePreferenceStore()
const activeMenu = computed(() => route.path)
const userMenuLabel = computed(() => (preferenceStore.language === 'en-US' ? 'Menu' : '菜单'))

const handleMenuSelect = (index: string) => router.push(index)
const handleUserCommand = (command: string) => command === 'logout' ? (userStore.logout(), router.push('/login')) : command === 'profile' ? router.push('/profile') : null

const refreshUserProfile = async () => {
  if (!userStore.isLoggedIn) return
  try {
    const result = await api.user.getProfile()
    const p = result.data
    if (!p) return
    userStore.setUserInfo({ id: p.id || 0, username: p.username || '', email: p.email || '', avatar: p.avatar || '', role: (p.role as 'admin' | 'user') || 'user' })
  } catch {}
}

onMounted(refreshUserProfile)
</script>

<style scoped lang="scss">
.main-layout { height: 100vh; display: flex; flex-direction: column; background: #f3f4f6; }
.layout-header { display: flex; justify-content: space-between; align-items: center; padding: 0 24px; background: #1f2937; }
.header-left { display: flex; align-items: center; gap: 32px; }
.logo { color: #fff; margin: 0; font-size: 22px; }
.header-menu { background: transparent; border-bottom: none; }
.layout-content { flex: 1; padding: 20px; overflow: auto; }
.user-info { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.username, .menu-label { color: #fff; }
</style>
