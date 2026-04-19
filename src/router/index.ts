import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录 - AI对话系统' }
  },
  {
    path: '/',
    name: 'Main',
    component: () => import('@/views/layout/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: 'chat'
      },
      {
        path: 'chat',
        name: 'Chat',
        component: () => import('@/views/chat/ChatPage.vue'),
        meta: { title: '智能体对话 - AI对话系统' }
      },
      {
        path: 'report/:id',
        name: 'Report',
        component: () => import('@/views/report/Report.vue'),
        meta: { title: '会话报告 - AI对话系统' },
        props: true
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/Profile.vue'),
        meta: { title: '个人中心 - AI对话系统' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const title = (to.meta?.title as string) || 'AI对话系统'
  document.title = title
  next()
})

export default router
