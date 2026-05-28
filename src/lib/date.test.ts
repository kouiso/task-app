import { describe, expect, it } from 'vitest';
import {
  dateOnlyFromValue,
  dateOnlyToUtcEndIso,
  dateOnlyToUtcStartIso,
  formatDateOnly,
  localDateOnly,
} from './date';

describe('date helpers', () => {
  it('dateOnlyFromValue は ISO 文字列から日付だけを取り出す', () => {
    expect(dateOnlyFromValue('2026-04-17T00:00:00.000Z')).toBe('2026-04-17');
  });

  it('formatDateOnly は timezone に依存せず表示用文字列を作る', () => {
    expect(formatDateOnly('2026-04-17T00:00:00.000Z')).toBe('2026/04/17');
  });

  it('dateOnlyToUtcStartIso は日付入力を UTC 開始時刻へ変換する', () => {
    expect(dateOnlyToUtcStartIso('2026-04-17')).toBe('2026-04-17T00:00:00.000Z');
  });

  it('dateOnlyToUtcEndIso は日付入力を UTC 終端時刻へ変換する', () => {
    expect(dateOnlyToUtcEndIso('2026-04-17')).toBe('2026-04-17T23:59:59.999Z');
  });

  it('dateOnlyToUtcStartIso は月末日付でも翌月へロールオーバーしない', () => {
    expect(dateOnlyToUtcStartIso('2026-01-31')).toBe('2026-01-31T00:00:00.000Z');
  });

  it('dateOnlyToUtcEndIso は年末日付でも翌年へロールオーバーしない', () => {
    expect(dateOnlyToUtcEndIso('2026-12-31')).toBe('2026-12-31T23:59:59.999Z');
  });

  it('dateOnlyFromValue は閏日を含む ISO 文字列でも日付部分を維持する', () => {
    expect(dateOnlyFromValue('2024-02-29T15:30:00.000Z')).toBe('2024-02-29');
  });

  it('localDateOnly はローカル日付を YYYY-MM-DD で返す', () => {
    expect(localDateOnly(new Date(2026, 3, 17, 12, 0, 0))).toBe('2026-04-17');
  });
});
