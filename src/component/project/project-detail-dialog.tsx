'use client';

import type { inferRouterOutputs } from '@trpc/server';
import { Archive, ArchiveRestore, Trash2, UserPlus } from 'lucide-react';
import { StatusBadge } from '@/component/task/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/component/ui/dialog';
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

interface ProjectDetailDialogProps {
  projectDetail: ProjectDetail | null | undefined;
  onClose: () => void;
  onAddMemberClick: () => void;
  onRemoveMember: (userId: string) => void;
  onArchive: (projectId: string, isArchived: boolean) => void;
}

export function ProjectDetailDialog({
  projectDetail,
  onClose,
  onAddMemberClick,
  onRemoveMember,
  onArchive,
}: ProjectDetailDialogProps) {
  return (
    <Dialog open={!!projectDetail} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: projectDetail?.color }}
            />
            {projectDetail?.name}
          </DialogTitle>
          <DialogDescription>{projectDetail?.description || '説明なし'}</DialogDescription>
        </DialogHeader>

        {projectDetail && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  メンバー ({projectDetail.members?.length ?? 0})
                </h3>
                <Button variant="outline" size="sm" onClick={onAddMemberClick}>
                  <UserPlus className="mr-2 h-4 w-4" /> メンバー追加
                </Button>
              </div>
              <div className="grid gap-2">
                {projectDetail.members?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 rounded-lg border bg-card"
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
                        <Badge variant="outline">
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
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">
                タスク ({projectDetail.tasks?.length ?? 0})
              </h3>
              <div className="grid gap-2">
                {projectDetail.tasks?.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col gap-1 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium">{task.title}</p>
                    <div className="flex gap-2">
                      <StatusBadge status={task.status} />
                      <Badge variant={getPriorityBadgeVariant(task.priority)}>
                        {TASK_PRIORITY_LABELS[task.priority] ?? task.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <div className="flex-1 flex justify-start">
            <Button
              variant="outline"
              onClick={() => projectDetail && onArchive(projectDetail.id, projectDetail.isArchived)}
            >
              {projectDetail?.isArchived ? (
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
          <Button onClick={onClose}>閉じる</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
