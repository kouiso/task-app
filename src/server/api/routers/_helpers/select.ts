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

export const projectMemberRoleSchema = z.enum<
  ProjectMemberRole,
  [ProjectMemberRole, ...ProjectMemberRole[]]
>(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);
