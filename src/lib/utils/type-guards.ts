import type { Comment } from '@/types/comment';
import type { Project, ProjectMember } from '@/types/project';
import type { Task } from '@/types/task';
import type { User } from '@/types/user';

export function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['id'] === 'string' &&
    typeof obj['title'] === 'string' &&
    (obj['description'] === undefined ||
      obj['description'] === null ||
      typeof obj['description'] === 'string') &&
    typeof obj['status'] === 'string' &&
    typeof obj['priority'] === 'string' &&
    typeof obj['projectId'] === 'string' &&
    typeof obj['createdById'] === 'string' &&
    (obj['assigneeId'] === undefined ||
      obj['assigneeId'] === null ||
      typeof obj['assigneeId'] === 'string') &&
    (obj['dueDate'] === undefined || obj['dueDate'] === null || obj['dueDate'] instanceof Date) &&
    obj['createdAt'] instanceof Date &&
    obj['updatedAt'] instanceof Date
  );
}

export function isProject(value: unknown): value is Project {
  if (!value || typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['id'] === 'string' &&
    typeof obj['name'] === 'string' &&
    (obj['description'] === undefined ||
      obj['description'] === null ||
      typeof obj['description'] === 'string') &&
    typeof obj['color'] === 'string' &&
    typeof obj['isArchived'] === 'boolean' &&
    (obj['startDate'] === undefined ||
      obj['startDate'] === null ||
      obj['startDate'] instanceof Date) &&
    (obj['endDate'] === undefined || obj['endDate'] === null || obj['endDate'] instanceof Date) &&
    obj['createdAt'] instanceof Date &&
    obj['updatedAt'] instanceof Date &&
    Array.isArray(obj['members'])
  );
}

export function isProjectMember(value: unknown): value is ProjectMember {
  if (!value || typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['id'] === 'string' &&
    typeof obj['role'] === 'string' &&
    typeof obj['userId'] === 'string' &&
    typeof obj['projectId'] === 'string' &&
    obj['joinedAt'] instanceof Date &&
    obj['user'] !== undefined &&
    obj['user'] !== null
  );
}

export function isComment(value: unknown): value is Comment {
  if (!value || typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['id'] === 'string' &&
    typeof obj['content'] === 'string' &&
    typeof obj['taskId'] === 'string' &&
    typeof obj['userId'] === 'string' &&
    obj['createdAt'] instanceof Date &&
    obj['updatedAt'] instanceof Date &&
    obj['user'] !== undefined &&
    obj['user'] !== null
  );
}

export function isUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false;

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['id'] === 'string' &&
    typeof obj['email'] === 'string' &&
    (obj['name'] === undefined || obj['name'] === null || typeof obj['name'] === 'string') &&
    (obj['avatar'] === undefined || obj['avatar'] === null || typeof obj['avatar'] === 'string') &&
    typeof obj['role'] === 'string' &&
    typeof obj['isActive'] === 'boolean' &&
    obj['createdAt'] instanceof Date &&
    obj['updatedAt'] instanceof Date
  );
}

export function isTaskArray(value: unknown): value is Task[] {
  return Array.isArray(value) && value.every(isTask);
}

export function isProjectArray(value: unknown): value is Project[] {
  return Array.isArray(value) && value.every(isProject);
}

export function isCommentArray(value: unknown): value is Comment[] {
  return Array.isArray(value) && value.every(isComment);
}

export function isUserArray(value: unknown): value is User[] {
  return Array.isArray(value) && value.every(isUser);
}

export function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export function assertIsTask(value: unknown): asserts value is Task {
  if (!isTask(value)) {
    throw new TypeError('Value is not a valid Task');
  }
}

export function assertIsProject(value: unknown): asserts value is Project {
  if (!isProject(value)) {
    throw new TypeError('Value is not a valid Project');
  }
}

export function assertIsComment(value: unknown): asserts value is Comment {
  if (!isComment(value)) {
    throw new TypeError('Value is not a valid Comment');
  }
}

export function assertIsUser(value: unknown): asserts value is User {
  if (!isUser(value)) {
    throw new TypeError('Value is not a valid User');
  }
}
