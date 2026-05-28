'use client';

import type { inferRouterOutputs } from '@trpc/server';
import { Archive, ArchiveRestore, ArrowLeft, CheckSquare, Trash2, UserPlus } from 'lucide-react';
import { StatusBadge } from '@/component/task/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/component/ui/card';
import { getPriorityBadgeVariant } from '@/lib/badge-variant';
import { TASK_PRIORITY_LABELS } from '@/lib/constant/priority';
import {
  isProjectMemberRole,
  PROJECT_MEMBER_ROLE,
  PROJECT_MEMBER_ROLE_LABELS,
} from '@/lib/constant/roles';
import type { AppRouter } from '@/server/api/root';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type ProjectDetail = RouterOutputs['project']['getById'];

interface ProjectDetailViewProps {
  projectDetail: ProjectDetail | null | undefined;
  onBack: () => void;
  onAddMemberClick: () => void;
  onRemoveMember: (userId: string) => void;
  onArchive: (projectId: string, isArchived: boolean) => void;
}

export function ProjectDetailView({
  projectDetail,
  onBack,
  onAddMemberClick,
  onRemoveMember,
  onArchive,
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

  return (
    <div className="flex flex-col gap-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            プロジェクト一覧
          </Button>
          <div className="flex items-center gap-3">
            <div
              className="h-4 w-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: projectDetail.color }}
            />
            <h1 className="text-3xl font-bold tracking-tight">{projectDetail.name}</h1>
            {projectDetail.isArchived && (
              <Badge variant="secondary" className="text-xs">
                アーカイブ済み
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="outline"
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
            <Button variant="outline" size="sm" onClick={onAddMemberClick}>
              <UserPlus className="mr-2 h-4 w-4" /> メンバー追加
            </Button>
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
                      <Badge variant="outline" className="text-xs">
                        {isProjectMemberRole(member.role)
                          ? PROJECT_MEMBER_ROLE_LABELS[member.role]
                          : member.role}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveMember(member.userId)}
                    disabled={member.role === PROJECT_MEMBER_ROLE.OWNER}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
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
              <CardTitle className="text-lg">タスク ({projectDetail.tasks?.length ?? 0})</CardTitle>
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
                    className="flex flex-col gap-1 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
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
