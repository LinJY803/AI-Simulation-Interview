<template>
  <div class="main-layout">
    <!-- 顶部导航栏 -->
    <el-header class="layout-header">
      <div class="header-left">
        <h1 class="logo">AI 面试系统</h1>
        <el-menu
          :default-active="activeMenu"
          mode="horizontal"
          @select="handleMenuSelect"
          class="header-menu"
        >
          <el-menu-item index="/dashboard">
            <el-icon><ChatLineRound /></el-icon>
            <span>AI面试</span>
          </el-menu-item>
          <el-menu-item index="/dashboard/history">
            <el-icon><Clock /></el-icon>
            <span>面试历史</span>
          </el-menu-item>
          <el-menu-item index="/dashboard/profile">
            <el-icon><User /></el-icon>
            <span>个人中心</span>
          </el-menu-item>
        </el-menu>
      </div>
      
      <div class="header-right">
        <el-dropdown @command="handleUserCommand">
          <div class="user-info">
            <el-avatar :size="32" :src="userStore.userInfo?.avatar" />
            <span class="username">{{ userStore.userInfo?.username }}</span>
            <el-icon><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>
                个人资料
              </el-dropdown-item>
              <el-dropdown-item command="settings">
                <el-icon><Setting /></el-icon>
                设置
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

    <!-- 主体内容 -->
    <div class="layout-content">
      <router-view />
    </div>

    <!-- 底部信息 -->
    <el-footer class="layout-footer">
      <div class="footer-content">
        <p>© 2024 AI面试系统. 基于 Vue3 + TypeScript + OpenAI GPT 构建</p>
        <p class="footer-links">
          <a href="#" @click.prevent="showAbout">关于我们</a>
          <span> | </span>
          <a href="#" @click.prevent="showHelp">帮助中心</a>
          <span> | </span>
          <a href="#" @click.prevent="showPrivacy">隐私政策</a>
        </p>
      </div>
    </el-footer>

    <!-- 关于对话框 -->
    <el-dialog
      v-model="aboutDialogVisible"
      title="关于 AI 面试系统"
      width="500px"
    >
      <div class="about-content">
        <p>AI面试系统是一个基于人工智能的智能面试平台，旨在帮助用户提升面试技能。</p>
        <p>主要功能：</p>
        <ul>
          <li>AI面试官模拟真实面试场景</li>
          <li>语音输入识别和实时对话</li>
          <li>多轮对话记忆和智能分析</li>
          <li>面试表现评分和可视化报告</li>
          <li>面试历史记录和对比分析</li>
        </ul>
        <p>技术栈：Vue3 + TypeScript + Vite + Pinia + Element Plus + OpenAI GPT + ECharts</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store'
import {
  ChatLineRound,
  Clock,
  User,
  ArrowDown,
  Setting,
  SwitchButton
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const aboutDialogVisible = ref(false)
const helpDialogVisible = ref(false)
const privacyDialogVisible = ref(false)

// 计算当前激活的菜单项
const activeMenu = computed(() => {
  return route.path
})

// 处理菜单选择
const handleMenuSelect = (index: string) => {
  router.push(index)
}

// 处理用户命令
const handleUserCommand = (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/dashboard/profile')
      break
    case 'settings':
      // 这里可以跳转到设置页面
      console.log('设置')
      break
    case 'logout':
      handleLogout()
      break
  }
}

// 处理登出
const handleLogout = () => {
  userStore.logout()
  router.push('/login')
}

// 显示关于对话框
const showAbout = () => {
  aboutDialogVisible.value = true
}

// 显示帮助
const showHelp = () => {
  ElMessage.info('帮助文档开发中...')
}

// 显示隐私政策
const showPrivacy = () => {
  ElMessage.info('隐私政策开发中...')
}
</script>

<style lang="scss" scoped>
.main-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;

  .layout-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);

    .header-left {
      display: flex;
      align-items: center;
      gap: 40px;

      .logo {
        color: white;
        font-size: 24px;
        font-weight: bold;
        margin: 0;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
      }

      :deep(.header-menu) {
        background: transparent;
        border-bottom: none;

        .el-menu-item {
          color: rgba(255, 255, 255, 0.9);
          font-size: 16px;
          transition: all 0.3s;

          &:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
          }

          &.is-active {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border-bottom-color: white;
          }

          .el-icon {
            margin-right: 8px;
          }
        }
      }
    }

    .header-right {
      .user-info {
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        padding: 8px 12px;
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.1);
        transition: background 0.3s;

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .username {
          color: white;
          font-weight: 500;
        }

        .el-icon {
          color: white;
        }
      }
    }
  }

  .layout-content {
    flex: 1;
    padding: 24px;
    overflow: auto;
  }

  .layout-footer {
    background: white;
    border-top: 1px solid #ebeef5;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px 24px;

    .footer-content {
      text-align: center;

      p {
        margin: 4px 0;
        color: #909399;
        font-size: 14px;
      }

      .footer-links {
        a {
          color: #409eff;
          text-decoration: none;
          transition: color 0.3s;

          &:hover {
            color: #66b1ff;
            text-decoration: underline;
          }
        }

        span {
          color: #dcdfe6;
          margin: 0 8px;
        }
      }
    }
  }
}

.about-content {
  p {
    margin-bottom: 12px;
    line-height: 1.6;
  }

  ul {
    margin: 12px 0 12px 20px;
    padding-left: 0;

    li {
      margin-bottom: 8px;
      color: #606266;
    }
  }
}
</style>