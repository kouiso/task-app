import { UserRole, ProjectMemberRole } from '@prisma/client';

export type Permission = 
  | 'task.create'
  | 'task.edit'
  | 'task.delete'
  | 'task.view'
  | 'task.assign'
  | 'project.create'
  | 'project.edit'
  | 'project.delete'
  | 'project.view'
  | 'project.manage_members'
  | 'user.manage'
  | 'report.view'
  | 'report.export';

const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    'task.create',
    'task.edit',
    'task.delete',
    'task.view',
    'task.assign',
    'project.create',
    'project.edit',
    'project.delete',
    'project.view',
    'project.manage_members',
    'user.manage',
    'report.view',
    'report.export',
  ],
  [UserRole.USER]: [
    'task.create',
    'task.edit',
    'task.view',
    'task.assign',
    'project.view',
    'report.view',
    'report.export',
  ],
};

const projectRolePermissions: Record<ProjectMemberRole, Permission[]> = {
  [ProjectMemberRole.OWNER]: [
    'task.create',
    'task.edit',
    'task.delete',
    'task.view',
    'task.assign',
    'project.edit',
    'project.delete',
    'project.view',
    'project.manage_members',
    'report.view',
    'report.export',
  ],
  [ProjectMemberRole.ADMIN]: [
    'task.create',
    'task.edit',
    'task.delete',
    'task.view',
    'task.assign',
    'project.edit',
    'project.view',
    'project.manage_members',
    'report.view',
    'report.export',
  ],
  [ProjectMemberRole.MEMBER]: [
    'task.create',
    'task.edit',
    'task.view',
    'task.assign',
    'project.view',
    'report.view',
  ],
  [ProjectMemberRole.VIEWER]: [
    'task.view',
    'project.view',
    'report.view',
  ],
};

export function hasGlobalPermission(
  userRole: UserRole,
  permission: Permission
): boolean {
  return rolePermissions[userRole]?.includes(permission) || false;
}

export function hasProjectPermission(
  projectRole: ProjectMemberRole | null,
  permission: Permission
): boolean {
  if (!projectRole) return false;
  return projectRolePermissions[projectRole]?.includes(permission) || false;
}

export function canUserAccessProject(
  userRole: UserRole,
  projectRole: ProjectMemberRole | null,
  permission: Permission
): boolean {
  if (userRole === UserRole.ADMIN) return true;
  
  return hasProjectPermission(projectRole, permission);
}

export function canEditTask(
  userRole: UserRole,
  projectRole: ProjectMemberRole | null,
  isCreator: boolean,
  isAssignee: boolean
): boolean {
  if (userRole === UserRole.ADMIN) return true;
  
  if (projectRole === ProjectMemberRole.OWNER || projectRole === ProjectMemberRole.ADMIN) {
    return true;
  }
  
  if (projectRole === ProjectMemberRole.MEMBER) {
    return isCreator || isAssignee;
  }
  
  return false;
}

export function canDeleteTask(
  userRole: UserRole,
  projectRole: ProjectMemberRole | null,
  isCreator: boolean
): boolean {
  if (userRole === UserRole.ADMIN) return true;
  
  if (projectRole === ProjectMemberRole.OWNER || projectRole === ProjectMemberRole.ADMIN) {
    return true;
  }
  
  return isCreator;
}

export function getPermittedActions(
  userRole: UserRole,
  projectRole: ProjectMemberRole | null = null
): Permission[] {
  const globalPerms = rolePermissions[userRole] || [];
  const projectPerms = projectRole ? projectRolePermissions[projectRole] || [] : [];
  
  return [...new Set([...globalPerms, ...projectPerms])];
}