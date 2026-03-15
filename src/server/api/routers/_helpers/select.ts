import { z } from 'zod';
import type { ProjectMemberRole } from '@/lib/constant/roles';

/**
 * Prismaのuser selectで繰り返し使われる4フィールドを集約し、
 * 変更時に全ルーターを個別修正する必要をなくす。
 */
export const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
} as const;

// user.tsのCRUD操作で共通して返すフィールド
export const USER_DETAIL_SELECT = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  role: true,
  isActive: true,
} as const;

export const projectMemberRoleSchema = z.enum<
  ProjectMemberRole,
  [ProjectMemberRole, ...ProjectMemberRole[]]
>(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);
