import { isTaskPriority } from '@/lib/constant/priority';
import { isTaskStatus } from '@/lib/constant/status';

export type SearchFormValues = {
  keyword: string;
  projectId: string;
  status: string;
  priority: string;
  assignedTo: string;
  dateFrom: string;
  dateTo: string;
};

const SEARCH_PARAM_KEYS: Array<keyof SearchFormValues> = [
  'keyword',
  'projectId',
  'status',
  'priority',
  'assignedTo',
  'dateFrom',
  'dateTo',
];

const normalizeSearchFormValues = (values: SearchFormValues): SearchFormValues => ({
  ...values,
  projectId: values.projectId || 'all',
  status: isTaskStatus(values.status) ? values.status : 'all',
  priority: isTaskPriority(values.priority) ? values.priority : 'all',
  assignedTo: values.assignedTo || 'all',
});

export const applySearchParamsToValues = (
  searchParams: URLSearchParams,
  currentValues: SearchFormValues,
): SearchFormValues => {
  const nextValues = { ...currentValues };

  for (const key of SEARCH_PARAM_KEYS) {
    nextValues[key] = searchParams.get(key) ?? '';
  }

  return normalizeSearchFormValues(nextValues);
};

export const buildSearchParamsFromValues = (values: SearchFormValues): URLSearchParams => {
  const params = new URLSearchParams();
  const normalizedValues = normalizeSearchFormValues(values);

  if (normalizedValues.keyword) params.set('keyword', normalizedValues.keyword);
  if (normalizedValues.projectId !== 'all') params.set('projectId', normalizedValues.projectId);
  if (normalizedValues.status !== 'all') params.set('status', normalizedValues.status);
  if (normalizedValues.priority !== 'all') params.set('priority', normalizedValues.priority);
  if (normalizedValues.assignedTo !== 'all') params.set('assignedTo', normalizedValues.assignedTo);
  if (normalizedValues.dateFrom) params.set('dateFrom', normalizedValues.dateFrom);
  if (normalizedValues.dateTo) params.set('dateTo', normalizedValues.dateTo);

  return params;
};
