import { describe, expect, it } from 'vitest';
import { applySearchParamsToValues, buildSearchParamsFromValues } from './search-filters';

const DEFAULT_VALUES = {
  keyword: '',
  projectId: 'all',
  status: 'all',
  priority: 'all',
  assignedTo: 'all',
  dateFrom: '',
  dateTo: '',
};

describe('search filter helpers', () => {
  it('URLから削除されたパラメータを既定値へ戻す', () => {
    const prev = {
      ...DEFAULT_VALUES,
      keyword: 'bug',
      status: 'DONE',
    };

    const next = applySearchParamsToValues(new URLSearchParams('projectId=p1'), prev);

    expect(next).toEqual({
      ...DEFAULT_VALUES,
      projectId: 'p1',
    });
  });

  it('all/空文字を除外して検索パラメータを構築する', () => {
    const params = buildSearchParamsFromValues({
      ...DEFAULT_VALUES,
      keyword: 'api',
      assignedTo: 'user-1',
    });

    expect(params.toString()).toBe('keyword=api&assignedTo=user-1');
  });
});
