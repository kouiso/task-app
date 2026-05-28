import { describe, expect, it } from 'vitest';
import {
  buildTaskFiltersQueryString,
  parseTaskFiltersFromSearchParams,
} from '@/lib/task-filter-query';

describe('task filter query helpers', () => {
  it('should parse valid query filters and ignore invalid status', () => {
    expect(
      parseTaskFiltersFromSearchParams(new URLSearchParams('project=p1&status=IN_PROGRESS')),
    ).toEqual({
      project: 'p1',
      status: 'IN_PROGRESS',
    });

    expect(
      parseTaskFiltersFromSearchParams(new URLSearchParams('project=p2&status=INVALID')),
    ).toEqual({
      project: 'p2',
      status: 'all',
    });
  });

  it('should build deterministic query strings and reset to empty for defaults', () => {
    expect(buildTaskFiltersQueryString({ project: 'all', status: 'all' })).toBe('');
    expect(buildTaskFiltersQueryString({ project: 'p1', status: 'all' })).toBe('project=p1');
    expect(buildTaskFiltersQueryString({ project: 'all', status: 'TODO' })).toBe('status=TODO');
    expect(buildTaskFiltersQueryString({ project: 'p1', status: 'TODO' })).toBe(
      'project=p1&status=TODO',
    );
  });
});
