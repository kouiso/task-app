import { httpStatusOf } from '@/lib/query-error';

const labels = {
  create: 'タスクの作成',
  update: 'タスクの更新',
  delete: 'タスクの削除',
  addTime: '作業時間の追加',
  createComment: 'コメントの投稿',
  updateComment: 'コメントの更新',
  deleteComment: 'コメントの削除',
} as const;
export type TaskWriteOperation = keyof typeof labels;

export function classifyTaskWriteError(error: unknown, operation: TaskWriteOperation) {
  const status = httpStatusOf(error);
  const label = labels[operation];
  if (status === 401)
    return {
      kind: 'auth' as const,
      message: 'ログインの有効期限が切れました。もう一度ログインしてください。',
    };
  if (status === 403)
    return {
      kind: 'known' as const,
      message: `${label}を実行できません。権限と対象の最新の状態を確認してください。`,
    };
  if (status === 404)
    return {
      kind: 'known' as const,
      message: `${label}の対象が見つかりません。最新の表示を確認してください。`,
    };
  if (status === 409)
    return {
      kind: 'known' as const,
      message: `${label}を現在の状態では実行できません。入力を控えてから画面を閉じ、最新の表示で開き直してください。`,
    };
  if (status === 400)
    return { kind: 'known' as const, message: `${label}の入力内容を確認してください。` };
  return {
    kind: 'unknown' as const,
    message: `${label}の結果を確認できません。最新の表示で操作結果を確認してから、必要な場合だけ再実行してください。`,
  };
}
