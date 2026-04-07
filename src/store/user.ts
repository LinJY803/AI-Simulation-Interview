/**
 * store/user.ts — 用户全局状态管理（Pinia）
 *
 * 管理用户认证和基本信息，包括：
 * - 登录状态 & JWT Token
 * - 用户资料（用户名、邮箱、头像、角色）
 * - Token 持久化（localStorage）
 *
 * ── 使用方式 ──────────────────────────────────────────
 * ```
 * import { useUserStore } from '@/store'
 *
 * const userStore = useUserStore()
 *
 * // 登录
 * userStore.setToken('jwt_xxx')
 * userStore.setUserInfo({ id: 1, username: 'admin', ... })
 *
 * // 退出
 * userStore.logout()
 *
 * // 判断是否登录
 * if (userStore.isLoggedIn) { ... }
 * ```
 */

import { defineStore } from 'pinia'

/** 用户信息 */
export interface UserInfo {
  /** 用户 ID */
  id: number
  /** 用户名 */
  username: string
  /** 邮箱 */
  email: string
  /** 头像 URL */
  avatar: string
  /** 角色：admin 管理员 / user 普通用户 */
  role: 'admin' | 'user'
}

export const useUserStore = defineStore('user', {
  // ── State ──────────────────────────────────────────
  state: (): {
    /** 用户信息（未登录时为 null） */
    userInfo: UserInfo | null
    /** JWT Token（持久化到 localStorage） */
    token: string
    /** 是否已登录（由 token 是否存在决定） */
    isLoggedIn: boolean
  } => ({
    userInfo: null,
    token: localStorage.getItem('token') || '',
    isLoggedIn: !!localStorage.getItem('token'),
  }),

  // ── Actions ────────────────────────────────────────
  actions: {
    /**
     * 设置用户信息
     * 通常在登录成功后调用。
     *
     * @param info - 完整的用户信息对象
     */
    setUserInfo(info: UserInfo) {
      this.userInfo = info
    },

    /**
     * 设置 JWT Token 并标记为已登录
     * Token 会自动持久化到 localStorage。
     *
     * @param token - JWT Token 字符串
     */
    setToken(token: string) {
      this.token = token
      this.isLoggedIn = true
      localStorage.setItem('token', token)
    },

    /**
     * 退出登录
     * 清除所有用户状态和 localStorage 中的 Token。
     * 调用后通常需要 router.push('/login') 跳转到登录页。
     */
    logout() {
      this.userInfo = null
      this.token = ''
      this.isLoggedIn = false
      localStorage.removeItem('token')
    },
  },
})
