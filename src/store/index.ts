/**
 * store/index.ts — Store 统一导出入口
 *
 * 所有 store 和类型都从这里导出，外部文件统一使用：
 *   import { useInterviewStore, useUserStore } from '@/store'
 *   import type { InterviewMessage, InterviewAnalysis } from '@/store'
 *
 * 底层实现分别位于：
 *   - store/interview.ts → useInterviewStore
 *   - store/user.ts      → useUserStore
 */

// ── Store 实例 ──────────────────────────────────────
export { useInterviewStore } from './interview'
export { useUserStore } from './user'

// ── 类型导出（方便 api.ts 等文件引用） ───────────────
export type {
  InterviewMessage,
  InterviewAnalysis,
  InterviewRecord,
  InterviewStatus,
  RealtimeScores,
  AnswerQuality,
  InterviewConfig,
} from './interview'

export type { UserInfo } from './user'

// ── 常量导出 ────────────────────────────────────────
export {
  POSITION_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_TAG_TYPES,
} from './interview'
