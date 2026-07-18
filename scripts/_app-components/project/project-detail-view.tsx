'use client';

import type { inferRouterOutputs } from '@trpc/server';
import { Archive, ArchiveRestore, ArrowLeft, CheckSquare, Trash2, UserPlus } from 'lucide-react';
import { StatusBadge } from '@/component/task/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/component/ui/select';
import { getPriorityBadgeVariant } from '@/lib/badge-variant';
import { TASK_PRIORITY_LABELS } from '@/lib/constant/priority';
import {
  isProjectMemberRole,
  PROJECT_MEMBER_ROLE,
  PROJECT_MEMBER_ROLE_LABELS,
  type ProjectMemberRole,
} from '@/lib/constant/roles';
import { TASK_STATUS } from '@/lib/constant/status';
import type { AppRouter } from '@/server/api/root';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ProjectDetail = RouterOutputs['project']['getById'];

interface ProjectDetailViewProps {
  projectDetail: ProjectDetail | null | undefined;
  onBack: () => void;
  onAddMemberClick: () => void;
  onRemoveMember: (userId: string) => void;
  // Day11 時点の呼び出しは権限 props とロール変更を渡さないため optional にする。
  // 未指定時は従来どおり表示し、最終的な権限判定はサーバー側で行う。
  onUpdateMemberRole?: (userId: string, role: ProjectMemberRole) => void;
  onArchive: (projectId: string, isArchived: boolean) => void;
  canManageMembers?: boolean;
  canArchive?: boolean;
}

export function ProjectDetailView({
  projectDetail,
  onBack,
  onAddMemberClick,
  onRemoveMember,
  onUpdateMemberRole,
  onArchive,
  canManageMembers = true,
  canArchive = true,
}: ProjectDetailViewProps) {
  if (!projectDetail) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <p>プロジェクトが見つかりません。</p>
        <Button variant="ghost" className="mt-4" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          プロジェクト一覧に戻る
        </Button>
      </div>
    );
  }

  // 総数はアクティブな4ステータスのみで数え、キャンセル済みは別表記にする（進捗指標との整合のため）。
  // アクティブ数とキャンセル数を1回のループで同時に集計する。
  let activeTaskCount = 0;
  let cancelledTaskCount = 0;
  for (const task of projectDetail.tasks ?? []) {
    if (task.status === TASK_STATUS.CANCELLED) {
      cancelledTaskCount++;
    } else {
      activeTaskCount++;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ヘッダー */}
      <div className="flex flex-col gap-4">
        {/* アクション行: 戻る・アーカイブ操作 */}
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className="shrink-0" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            プロジェクト一覧
          </Button>
          {canArchive && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => onArchive(projectDetail.id, projectDetail.isArchived)}
            >
              {projectDetail.isArchived ? (
                <>
                  <ArchiveRestore className="mr-2 h-4 w-4" /> アーカイブ解除
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" /> アーカイブ
                </>
              )}
            </Button>
          )}
        </div>
        {/* タイトル行: 長い名前も省略せず全文表示する。アーカイブバッジはタイトルの下に置く */}
        <div className="flex items-start gap-3">
          <div
            className="mt-2.5 h-4 w-4 rounded-full shrink-0"
            style={{ backgroundColor: projectDetail.color }}
          />
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight break-words">{projectDetail.name}</h1>
            {projectDetail.isArchived && (
              <Badge variant="secondary" className="mt-2 text-xs">
                アーカイブ済み
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* 説明 */}
      {projectDetail.description && (
        <p className="text-muted-foreground">{projectDetail.description}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* メンバーセクション */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">
              メンバー ({projectDetail.members?.length ?? 0})
            </CardTitle>
            {canManageMembers && (
              <Button variant="outline" size="sm" onClick={onAddMemberClick}>
                <UserPlus className="mr-2 h-4 w-4" /> メンバー追加
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {projectDetail.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {member.user?.avatar && <AvatarImage src={member.user.avatar} />}
                      <AvatarFallback>
                        {(member.user?.name || member.user?.email || '?')[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">
                        {member.user?.name || member.user?.email || '不明'}
                      </p>
                      {member.role === PROJECT_MEMBER_ROLE.OWNER ||
                      !canManageMembers ||
                      !onUpdateMemberRole ? (
                        // オーナーは権限変更対象外。加えて、メンバー管理権限を持たないユーザーには
                        // 読み取り専用で表示する（操作してもバックエンドで弾かれるため誤操作を防ぐ）
                        <Badge variant="outline" className="text-xs">
                          {isProjectMemberRole(member.role)
                            ? PROJECT_MEMBER_ROLE_LABELS[member.role]
                            : member.role}
                        </Badge>
                      ) : (
                        <Select
                          value={member.role}
                          onValueChange={(value) => {
                            if (isProjectMemberRole(value)) {
                              onUpdateMemberRole?.(member.userId, value);
                            }
                          }}
                        >
                          <SelectTrigger
                            aria-label={`${member.user?.name || member.user?.email || '不明'}の権限`}
                            className="mt-1 h-7 w-32 text-xs"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PROJECT_MEMBER_ROLE_LABELS)
                              .filter(([value]) => value !== PROJECT_MEMBER_ROLE.OWNER)
                              .map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                  {canManageMembers && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${member.user?.name || member.user?.email || '不明'}をプロジェクトから削除`}
                      onClick={() => onRemoveMember(member.userId)}
                      disabled={member.role === PROJECT_MEMBER_ROLE.OWNER}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* タスクセクション */}
        <Card>
          <CardHeader className="space-y-0 pb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">
                タスク ({activeTaskCount})
                {cancelledTaskCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    （キャンセル済 {cancelledTaskCount}）
                  </span>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {projectDetail.tasks?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  タスクがありません。
                </p>
              ) : (
                projectDetail.tasks?.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col gap-1 p-3 rounded-lg border bg-muted/30"
                  >
                    <p className="font-medium">{task.title}</p>
                    <div className="flex gap-2">
                      <StatusBadge status={task.status} />
                      <Badge variant={getPriorityBadgeVariant(task.priority)}>
                        {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
