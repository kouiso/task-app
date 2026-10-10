import { z } from 'zod';
import { isTaskStatus, type TaskStatus } from '@/lib/constant/status';

export type TaskFilters = {
  project: string;
  status: TaskStatus | 'all';
};

export const DEFAULT_TASK_FILTERS: TaskFilters = {
  project: 'all',
  status: 'all',
};

const cuidSchema = z.string().cuid();

const normalizeProjectFilter = (value: string): string =>
  value === DEFAULT_TASK_FILTERS.project || cuidSchema.safeParse(value).success
    ? value
    : DEFAULT_TASK_FILTERS.project;

export const parseTaskFiltersFromSearchParams = (searchParams: URLSearchParams): TaskFilters => {
  const project = normalizeProjectFilter(
    searchParams.get('project') ?? DEFAULT_TASK_FILTERS.project,
  );
  const rawStatus = searchParams.get('status') ?? DEFAULT_TASK_FILTERS.status;

  return {
    project,
    status:
      rawStatus === 'all' || isTaskStatus(rawStatus) ? rawStatus : DEFAULT_TASK_FILTERS.status,
  };
};

export const buildTaskFiltersQueryString = (filters: TaskFilters): string => {
  const params = new URLSearchParams();
  const project = normalizeProjectFilter(filters.project);

  if (project !== DEFAULT_TASK_FILTERS.project) {
    params.set('project', project);
  }

  if (filters.status !== DEFAULT_TASK_FILTERS.status) {
    params.set('status', filters.status);
  }

  return params.toString();
};
