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
  it.each([
    'bad',
    '2026-02-30',
    '2026-13-01',
    '2026-2-01',
  ])('不正な日付%sを検索条件から除く', (date) => {
    const params = new URLSearchParams({ dateFrom: date, dateTo: date, keyword: 'api' });
    const values = applySearchParamsToValues(params, DEFAULT_VALUES);
    expect(values).toEqual({ ...DEFAULT_VALUES, keyword: 'api' });
    expect(
      buildSearchParamsFromValues({ ...DEFAULT_VALUES, dateFrom: date, dateTo: date }).toString(),
    ).toBe('');
  });

  it('有効なうるう日と日付範囲を維持する', () => {
    const values = { ...DEFAULT_VALUES, dateFrom: '2024-02-29', dateTo: '2024-03-01' };
    expect(applySearchParamsToValues(buildSearchParamsFromValues(values), DEFAULT_VALUES)).toEqual(
      values,
    );
  });

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

  it('不正なステータスと優先度を既定値へ戻す', () => {
    const next = applySearchParamsToValues(
      new URLSearchParams('status=ARCHIVED&priority=CRITICAL&keyword=api'),
      DEFAULT_VALUES,
    );

    expect(next).toEqual({
      ...DEFAULT_VALUES,
      keyword: 'api',
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

  it('検索パラメータ構築時も不正なステータスと優先度を除外する', () => {
    const params = buildSearchParamsFromValues({
      ...DEFAULT_VALUES,
      status: 'ARCHIVED',
      priority: 'CRITICAL',
      projectId: 'p1',
    });

    expect(params.toString()).toBe('projectId=p1');
  });
});
