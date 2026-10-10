import { httpStatusOf } from '@/lib/query-error';

const labels = {
  complete: 'タスクの一括完了',
  delete: 'タスクの一括削除',
  status: 'タスクのステータス変更',
} as const;
export type TaskBulkOperation = keyof typeof labels;

export function classifyTaskBulkError(error: unknown, operation: TaskBulkOperation) {
  const data = typeof error === 'object' && error !== null && 'data' in error ? error.data : null;
  const code = typeof data === 'object' && data !== null && 'code' in data ? data.code : null;
  const status = httpStatusOf(error);
  const label = labels[operation];
  if (code === 'UNAUTHORIZED' || status === 401)
    return {
      kind: 'auth' as const,
      message: 'ログインの有効期限が切れました。もう一度ログインしてください。',
    };
  if (code === 'FORBIDDEN' || status === 403)
    return {
      kind: 'known' as const,
      message: `${label}を実行できません。権限と対象の最新の状態を確認してください。`,
    };
  if (code === 'NOT_FOUND' || status === 404)
    return {
      kind: 'known' as const,
      message: `${label}の対象が見つかりません。最新の一覧を確認してください。`,
    };
  if (code === 'BAD_REQUEST' || status === 400)
    return {
      kind: 'known' as const,
      message: `${label}の操作条件を確認してください。一度に選べるのは100件までです。`,
    };
  if (code === 'CONFLICT' || status === 409)
    return {
      kind: 'known' as const,
      message: `${label}を現在の状態では実行できません。最新の表示を確認してください。`,
    };
  return {
    kind: 'unknown' as const,
    message: `${label}の結果を確認できません。最新の一覧で操作結果を確認してから、必要な場合だけ再実行してください。`,
  };
}
