export const USER_ROLE = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  USER: 'ユーザー',
  ADMIN: '管理者',
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && value in USER_ROLE;
}

export const PROJECT_MEMBER_ROLE = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
} as const;

export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLE)[keyof typeof PROJECT_MEMBER_ROLE];

export const PROJECT_MEMBER_ROLE_LABELS: Record<ProjectMemberRole, string> = {
  OWNER: 'オーナー',
  ADMIN: '管理者',
  MEMBER: 'メンバー',
  VIEWER: '閲覧者',
};

export const PROJECT_MEMBER_ROLE_PERMISSIONS: Record<
  ProjectMemberRole,
  {
    canEdit: boolean;
    canDelete: boolean;
    canManageMembers: boolean;
    canArchive: boolean;
    canView: boolean;
  }
> = {
  OWNER: {
    canEdit: true,
    canDelete: true,
    canManageMembers: true,
    canArchive: true,
    canView: true,
  },
  ADMIN: {
    canEdit: true,
    canDelete: true,
    canManageMembers: true,
    canArchive: false,
    canView: true,
  },
  MEMBER: {
    canEdit: true,
    canDelete: false,
    canManageMembers: false,
    canArchive: false,
    canView: true,
  },
  VIEWER: {
    canEdit: false,
    canDelete: false,
    canManageMembers: false,
    canArchive: false,
    canView: true,
  },
};

export function isProjectMemberRole(value: unknown): value is ProjectMemberRole {
  return typeof value === 'string' && value in PROJECT_MEMBER_ROLE;
}

export function hasPermission(
  role: ProjectMemberRole,
  permission: keyof (typeof PROJECT_MEMBER_ROLE_PERMISSIONS)[ProjectMemberRole],
): boolean {
  return PROJECT_MEMBER_ROLE_PERMISSIONS[role][permission];
}
