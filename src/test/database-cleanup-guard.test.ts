import { describe, expect, it } from 'vitest';
import { createDatabaseCleanupGuard } from './database-cleanup-guard';

describe('database cleanup guard', () => {
  it('クリーンアップ待機中は次のfixture開始を拒否する', () => {
    const guard = createDatabaseCleanupGuard();
    guard.begin();

    expect(() => guard.assertReady()).toThrow(
      '前のテストのデータベースクリーンアップが完了していません',
    );
  });

  it('クリーンアップ失敗後は同じ原因で次のfixture開始を拒否する', () => {
    const guard = createDatabaseCleanupGuard();
    const failure = new Error('cleanup failed');
    guard.begin();
    guard.fail(failure);

    expect(() => guard.assertReady()).toThrow(failure);
  });

  it('クリーンアップ成功後は次のfixture開始を許可する', () => {
    const guard = createDatabaseCleanupGuard();
    guard.begin();
    guard.succeed();

    expect(() => guard.assertReady()).not.toThrow();
  });
});
