type CleanupState =
  | { status: 'ready' }
  | { status: 'pending' }
  | { status: 'failed'; error: unknown };

export function createDatabaseCleanupGuard() {
  let state: CleanupState = { status: 'ready' };

  const assertReady = () => {
    if (state.status === 'pending') {
      throw new Error('前のテストのデータベースクリーンアップが完了していません');
    }
    if (state.status === 'failed') {
      throw state.error;
    }
  };

  return {
    assertReady,
    begin() {
      assertReady();
      state = { status: 'pending' };
    },
    succeed() {
      state = { status: 'ready' };
    },
    fail(error: unknown) {
      state = { status: 'failed', error };
    },
  };
}
