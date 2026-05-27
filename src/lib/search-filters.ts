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

export const applySearchParamsToValues = (
  searchParams: URLSearchParams,
  currentValues: SearchFormValues,
): SearchFormValues => {
  const nextValues = { ...currentValues };

  for (const key of SEARCH_PARAM_KEYS) {
    nextValues[key] = searchParams.get(key) ?? '';
  }

  nextValues.projectId ||= 'all';
  nextValues.status ||= 'all';
  nextValues.priority ||= 'all';
  nextValues.assignedTo ||= 'all';

  return nextValues;
};

export const buildSearchParamsFromValues = (values: SearchFormValues): URLSearchParams => {
  const params = new URLSearchParams();

  if (values.keyword) params.set('keyword', values.keyword);
  if (values.projectId !== 'all') params.set('projectId', values.projectId);
  if (values.status !== 'all') params.set('status', values.status);
  if (values.priority !== 'all') params.set('priority', values.priority);
  if (values.assignedTo !== 'all') params.set('assignedTo', values.assignedTo);
  if (values.dateFrom) params.set('dateFrom', values.dateFrom);
  if (values.dateTo) params.set('dateTo', values.dateTo);

  return params;
};
