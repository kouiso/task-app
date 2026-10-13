import { isTaskStatus, type TaskStatus } from '@/lib/constant/status';

export type TaskFilters = {
  project: string;
  status: TaskStatus | 'all';
};

export const DEFAULT_TASK_FILTERS: TaskFilters = {
  project: 'all',
  status: 'all',
};

export const parseTaskFiltersFromSearchParams = (searchParams: URLSearchParams): TaskFilters => {
  const project = searchParams.get('project') ?? DEFAULT_TASK_FILTERS.project;
  const rawStatus = searchParams.get('status') ?? DEFAULT_TASK_FILTERS.status;

  return {
    project,
    status:
      rawStatus === 'all' || isTaskStatus(rawStatus) ? rawStatus : DEFAULT_TASK_FILTERS.status,
  };
};

export const buildTaskFiltersQueryString = (filters: TaskFilters): string => {
  const params = new URLSearchParams();

  if (filters.project !== DEFAULT_TASK_FILTERS.project) {
    params.set('project', filters.project);
  }

  if (filters.status !== DEFAULT_TASK_FILTERS.status) {
    params.set('status', filters.status);
  }

  return params.toString();
};
