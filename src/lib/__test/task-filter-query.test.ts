import { describe, expect, it } from 'vitest';
import {
  buildTaskFiltersQueryString,
  parseTaskFiltersFromSearchParams,
} from '@/lib/task-filter-query';

const PROJECT_ONE_ID = 'cm11111111111111111111111';
const PROJECT_TWO_ID = 'cm22222222222222222222222';

describe('task filter query helpers', () => {
  it('should parse valid query filters and ignore invalid status', () => {
    expect(
      parseTaskFiltersFromSearchParams(
        new URLSearchParams(`project=${PROJECT_ONE_ID}&status=IN_PROGRESS`),
      ),
    ).toEqual({
      project: PROJECT_ONE_ID,
      status: 'IN_PROGRESS',
    });

    expect(
      parseTaskFiltersFromSearchParams(
        new URLSearchParams(`project=${PROJECT_TWO_ID}&status=INVALID`),
      ),
    ).toEqual({
      project: PROJECT_TWO_ID,
      status: 'all',
    });
  });

  it.each(['', 'foo', 'project-a'])('should normalize invalid project %j to all', (project) => {
    expect(
      parseTaskFiltersFromSearchParams(new URLSearchParams({ project, status: 'IN_PROGRESS' })),
    ).toEqual({ project: 'all', status: 'IN_PROGRESS' });
  });

  it('should build deterministic query strings and reset to empty for defaults', () => {
    expect(buildTaskFiltersQueryString({ project: 'all', status: 'all' })).toBe('');
    expect(buildTaskFiltersQueryString({ project: PROJECT_ONE_ID, status: 'all' })).toBe(
      `project=${PROJECT_ONE_ID}`,
    );
    expect(buildTaskFiltersQueryString({ project: 'all', status: 'TODO' })).toBe('status=TODO');
    expect(buildTaskFiltersQueryString({ project: PROJECT_ONE_ID, status: 'TODO' })).toBe(
      `project=${PROJECT_ONE_ID}&status=TODO`,
    );
    expect(buildTaskFiltersQueryString({ project: 'project-a', status: 'TODO' })).toBe(
      'status=TODO',
    );
  });
});
