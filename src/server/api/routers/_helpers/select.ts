import { z } from 'zod';
import { PROJECT_MEMBER_ROLE } from '@/lib/constant/roles';

export const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
} as const;

export const USER_DETAIL_SELECT = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  role: true,
  isActive: true,
} as const;

export const projectMemberRoleSchema = z.nativeEnum(PROJECT_MEMBER_ROLE);
