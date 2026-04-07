import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录 - AI面试系统' }
  },
  {
    path: '/',
    name: 'Main',
    component: () => import('@/views/layout/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: 'interview'
      },
      {
        path: 'interview',
        name: 'Interview',
        component: () => import('@/views/interview/Interview.vue'),
        meta: { title: 'AI面试 - AI面试系统' }
      },
      {
        path: 'history',
        name: 'History',
        component: () => import('@/views/history/History.vue'),
        meta: { title: '面试历史 - AI面试系统' }
      },
      {
        path: 'report/:id',
        name: 'Report',
        component: () => import('@/views/report/Report.vue'),
        meta: { title: '面试报告 - AI面试系统' },
        props: true
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/profile/Profile.vue'),
        meta: { title: '个人中心 - AI面试系统' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：设置页面标题
router.beforeEach((to, from, next) => {
  const title = to.meta?.title as string || 'AI面试系统'
  document.title = title
  next()
})

export default router