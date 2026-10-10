import { httpStatusOf } from '@/lib/query-error';

const operationLabels = {
  create: 'プロジェクトの作成',
  update: 'プロジェクトの更新',
  delete: 'プロジェクトの削除',
  addMember: 'メンバーの追加',
  removeMember: 'メンバーの削除',
  updateMemberRole: 'メンバーの権限変更',
  archive: 'プロジェクトのアーカイブ',
  unarchive: 'プロジェクトのアーカイブ解除',
} as const;

export type ProjectWriteOperation = keyof typeof operationLabels;

const confirmationHints: Record<ProjectWriteOperation, string> = {
  create: 'プロジェクト一覧で作成済みか確認',
  update: 'プロジェクトの内容を確認',
  delete: 'プロジェクト一覧で削除済みか確認',
  addMember: 'メンバー一覧で追加済みか確認',
  removeMember: 'メンバー一覧で削除済みか確認',
  updateMemberRole: 'メンバー一覧で現在の権限を確認',
  archive: 'アーカイブ表示を含む一覧で現在の状態を確認',
  unarchive: 'アーカイブ表示を含む一覧で現在の状態を確認',
};

export function classifyProjectWriteError(error: unknown, operation: ProjectWriteOperation) {
  const data = typeof error === 'object' && error !== null && 'data' in error ? error.data : null;
  const code = typeof data === 'object' && data !== null && 'code' in data ? data.code : null;
  const status = httpStatusOf(error);
  const label = operationLabels[operation];
  if (code === 'UNAUTHORIZED' || status === 401) {
    return {
      kind: 'auth' as const,
      message: 'ログインの有効期限が切れました。もう一度ログインしてください。',
    };
  }
  if (code === 'FORBIDDEN' || status === 403) {
    return {
      kind: 'known' as const,
      message: `${label}の権限がありません。管理者に確認してください。`,
    };
  }
  if (code === 'NOT_FOUND' || status === 404) {
    return {
      kind: 'known' as const,
      message: `${label}の対象が見つかりません。最新の表示を確認してください。`,
    };
  }
  if (code === 'CONFLICT' || status === 409) {
    return {
      kind: 'known' as const,
      message: `${label}を現在の状態では実行できません。最新の表示を確認してください。`,
    };
  }
  if (code === 'BAD_REQUEST' || status === 400) {
    return {
      kind: 'known' as const,
      message: `${label}の入力内容と操作条件を確認してください。${operation === 'removeMember' || operation === 'updateMemberRole' ? '最後のオーナーの場合は、削除・降格できません。' : ''}`,
    };
  }
  return {
    kind: 'unknown' as const,
    message: `${label}の結果を確認できません。${confirmationHints[operation]}してから、必要な場合だけ再実行してください。`,
  };
}
