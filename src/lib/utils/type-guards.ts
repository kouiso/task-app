/**
 * Type Guard Functions
 * ランタイム型チェックと型安全性を保証するユーティリティ関数
 */

import type {
  Task,
  User,
  Project,
  Comment,
  ActiveTimerTask,
  CompletedTask,
  Database,
} from '../supabase/types'

// =============================================================================
// 🔍 基本型ガード関数
// =============================================================================

/**
 * null/undefined チェック
 */
export const isNotNull = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined
}

/**
 * 空文字チェック
 */
export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * 正の数チェック
 */
export const isPositiveNumber = (value: unknown): value is number => {
  return typeof value === 'number' && value > 0
}

/**
 * 有効な日付文字列チェック
 */
export const isValidDateString = (value: unknown): value is string => {
  if (typeof value !== 'string') return false
  const date = new Date(value)
  return !isNaN(date.getTime())
}

// =============================================================================
// 🎯 ビジネスロジック型ガード
// =============================================================================

/**
 * アクティブタイマータスク判定
 */
export const isActiveTimerTask = (task: Task): task is ActiveTimerTask => {
  return (
    task.is_timer_active === true &&
    task.timer_started_at !== null &&
    isValidDateString(task.timer_started_at)
  )
}

/**
 * 完了済みタスク判定
 */
export const isCompletedTask = (task: Task): task is CompletedTask => {
  return (
    task.status === 'DONE' &&
    task.completed_at !== null &&
    isValidDateString(task.completed_at)
  )
}

/**
 * 期限切れタスク判定
 */
export const isOverdueTask = (task: Task): boolean => {
  if (!task.due_date || task.status === 'DONE') return false
  return new Date(task.due_date) < new Date()
}

/**
 * 高優先度タスク判定
 */
export const isHighPriorityTask = (task: Task): boolean => {
  return task.priority === 'HIGH' || task.priority === 'URGENT'
}

/**
 * 担当者が設定されたタスク判定
 */
export const isAssignedTask = (
  task: Task
): task is Task & { assignee_id: string } => {
  return isNonEmptyString(task.assignee_id)
}

// =============================================================================
// 🔐 権限・アクセス制御型ガード
// =============================================================================

/**
 * 管理者ユーザー判定
 */
export const isAdminUser = (user: User): boolean => {
  return user.role === 'ADMIN'
}

/**
 * アクティブユーザー判定
 */
export const isActiveUser = (user: User): boolean => {
  return user.is_active === true
}

/**
 * プロジェクトオーナー判定
 */
export const isProjectOwner = (
  memberRole: Database['public']['Enums']['project_member_role']
): boolean => {
  return memberRole === 'OWNER'
}

/**
 * プロジェクト管理権限判定
 */
export const hasProjectManagePermission = (
  memberRole: Database['public']['Enums']['project_member_role']
): boolean => {
  return memberRole === 'OWNER' || memberRole === 'ADMIN'
}

/**
 * タスク編集権限判定
 */
export const canEditTask = (task: Task, userId: string, isAdmin = false): boolean => {
  if (isAdmin) return true
  return task.created_by_id === userId || task.assignee_id === userId
}

// =============================================================================
// 📊 データ検証型ガード
// =============================================================================

/**
 * 有効なタスク状態遷移チェック
 */
export const isValidStatusTransition = (
  from: Database['public']['Enums']['task_status'],
  to: Database['public']['Enums']['task_status']
): boolean => {
  const validTransitions: Record<
    Database['public']['Enums']['task_status'],
    Database['public']['Enums']['task_status'][]
  > = {
    TODO: ['IN_PROGRESS', 'BLOCKED'],
    IN_PROGRESS: ['IN_REVIEW', 'DONE', 'BLOCKED', 'TODO'],
    IN_REVIEW: ['DONE', 'IN_PROGRESS'],
    DONE: ['IN_PROGRESS'], // 再オープン可能
    BLOCKED: ['TODO', 'IN_PROGRESS'],
  }

  return validTransitions[from]?.includes(to) ?? false
}

/**
 * 有効なメールアドレスチェック
 */
export const isValidEmail = (email: unknown): email is string => {
  if (!isNonEmptyString(email)) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * 有効な時間範囲チェック（分単位）
 */
export const isValidTimeRange = (minutes: unknown): minutes is number => {
  return (
    typeof minutes === 'number' &&
    minutes >= 0 &&
    minutes <= 1440 && // 24時間以内
    Number.isInteger(minutes)
  )
}

/**
 * 有効なカラーコードチェック
 */
export const isValidHexColor = (color: unknown): color is string => {
  if (!isNonEmptyString(color)) return false
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  return hexRegex.test(color)
}

// =============================================================================
// 🎨 UI関連型ガード
// =============================================================================

/**
 * Supabase エラーオブジェクト判定
 */
export const isSupabaseError = (
  error: unknown
): error is { message: string; details?: string; hint?: string } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  )
}

/**
 * ネットワークエラー判定
 */
export const isNetworkError = (error: unknown): boolean => {
  if (!isSupabaseError(error)) return false
  return error.message.includes('network') || error.message.includes('fetch')
}

/**
 * 認証エラー判定
 */
export const isAuthError = (error: unknown): boolean => {
  if (!isSupabaseError(error)) return false
  return (
    error.message.includes('Invalid login credentials') ||
    error.message.includes('User not found') ||
    error.message.includes('Access token expired')
  )
}

// =============================================================================
// 🔄 配列・オブジェクト型ガード
// =============================================================================

/**
 * 空でない配列判定
 */
export const isNonEmptyArray = <T>(value: unknown): value is T[] => {
  return Array.isArray(value) && value.length > 0
}

/**
 * タスク配列判定
 */
export const isTaskArray = (value: unknown): value is Task[] => {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      try {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof (item as any).id === 'string' &&
          typeof (item as any).title === 'string'
        )
      } catch {
        return false
      }
    })
  )
}

/**
 * ユーザー配列判定
 */
export const isUserArray = (value: unknown): value is User[] => {
  return (
    Array.isArray(value) &&
    value.every((item) => {
      try {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof (item as any).id === 'string' &&
          typeof (item as any).email === 'string'
        )
      } catch {
        return false
      }
    })
  )
}

// =============================================================================
// 🎯 アサーション関数
// =============================================================================

/**
 * Task オブジェクトのアサーション
 */
export const assertIsTask = (obj: unknown): asserts obj is Task => {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('Expected Task object, got null or non-object')
  }

  const task = obj as Record<string, unknown>

  if (!isNonEmptyString(task.id)) {
    throw new Error('Task.id must be a non-empty string')
  }

  if (!isNonEmptyString(task.title)) {
    throw new Error('Task.title must be a non-empty string')
  }

  if (!isNonEmptyString(task.project_id)) {
    throw new Error('Task.project_id must be a non-empty string')
  }

  if (!isNonEmptyString(task.created_by_id)) {
    throw new Error('Task.created_by_id must be a non-empty string')
  }

  const validStatuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']
  if (!validStatuses.includes(task.status as string)) {
    throw new Error(`Task.status must be one of: ${validStatuses.join(', ')}`)
  }

  const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
  if (!validPriorities.includes(task.priority as string)) {
    throw new Error(`Task.priority must be one of: ${validPriorities.join(', ')}`)
  }
}

/**
 * User オブジェクトのアサーション
 */
export const assertIsUser = (obj: unknown): asserts obj is User => {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('Expected User object, got null or non-object')
  }

  const user = obj as Record<string, unknown>

  if (!isNonEmptyString(user.id)) {
    throw new Error('User.id must be a non-empty string')
  }

  if (!isValidEmail(user.email)) {
    throw new Error('User.email must be a valid email address')
  }

  const validRoles = ['USER', 'ADMIN']
  if (!validRoles.includes(user.role as string)) {
    throw new Error(`User.role must be one of: ${validRoles.join(', ')}`)
  }
}