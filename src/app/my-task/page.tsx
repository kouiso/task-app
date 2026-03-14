'use client';

import { useMemo, useState } from 'react';
import { AppLayout } from '@/component/layout/app-layout';
import { TaskCard } from '@/component/task/task-card';
import { TaskDialog, type TaskFormData } from '@/component/task/task-dialog';
import { DeleteConfirmDialog } from '@/component/ui/delete-confirm-dialog';
import { PageLoadingSpinner } from '@/component/ui/loading-spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/component/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/component/ui/tabs';
import { isTaskStatus, type TaskStatus } from '@/lib/constant/status';
import { api } from '@/trpc/react';

const STATUS_TABS: { label: string; value: TaskStatus | 'all' }[] = [
  { label: 'すべて', value: 'all' },
  { label: '未対応', value: 'TODO' },
  { label: '進行中', value: 'IN_PROGRESS' },
  { label: 'レビュー中', value: 'IN_REVIEW' },
  { label: '完了', value: 'DONE' },
];

export default function MyTasksPage() {
  const [activeTab, setActiveTab] = useState<TaskStatus | 'all'>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskFormData | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const { data: currentUser } = api.user.getCurrentUser.useQuery();
  const { data: projects } = api.project.getAll.useQuery();
  const { data: users } = api.search.getProjectMembers.useQuery();
  const { data: tasks, isLoading } = api.task.getAll.useQuery(
    {
      assigneeId: currentUser?.id,
      status: activeTab === 'all' ? undefined : activeTab,
      projectId: filterProject === 'all' ? undefined : filterProject,
    },
    { enabled: !!currentUser },
  );

  const utils = api.useUtils();

  const updateMutation = api.task.update.useMutation({
    onSuccess: () => {
      utils.task.getAll.invalidate();
      setDialogOpen(false);
    },
  });

  const deleteMutation = api.task.delete.useMutation({
    onSuccess: () => {
      utils.task.getAll.invalidate();
    },
  });

  const handleEdit = (taskId: string) => {
    const task = tasks?.find((t) => t.id === taskId);
    if (task) {
      const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : undefined;

      setEditingTask({
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        projectId: task.projectId,
        ...(dueDate && { dueDate }),
        ...(task.estimatedHours && { estimatedHours: task.estimatedHours }),
        ...(task.assigneeId && { assigneeId: task.assigneeId }),
      });
      setDialogOpen(true);
    }
  };

  const handleDelete = (taskId: string) => {
    setDeleteTargetId(taskId);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = (data: TaskFormData) => {
    if (data.id) {
      updateMutation.mutate({
        id: data.id,
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        estimatedHours: data.estimatedHours ?? null,
        assigneeId: data.assigneeId || null,
      });
    }
  };

  const groupedTasks = useMemo(() => {
    const overdue: typeof tasks = [];
    const today: typeof tasks = [];
    const upcoming: typeof tasks = [];
    const noDueDate: typeof tasks = [];
    const now = new Date();
    const todayStr = now.toDateString();

    for (const t of tasks ?? []) {
      if (!t.dueDate) {
        noDueDate.push(t);
      } else {
        const dueDate = new Date(t.dueDate);
        const dueDateStr = dueDate.toDateString();
        if (dueDateStr === todayStr) {
          today.push(t);
        } else if (dueDate < now) {
          overdue.push(t);
        } else {
          upcoming.push(t);
        }
      }
    }

    return { overdue, today, upcoming, noDueDate };
  }, [tasks]);

  if (isLoading) {
    return <PageLoadingSpinner />;
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-bold tracking-tight">マイタスク</h1>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              if (v === 'all' || isTaskStatus(v)) setActiveTab(v);
            }}
            className="w-full sm:w-auto"
          >
            <TabsList>
              {STATUS_TABS.map((tab) => (
                <TabsTrigger key={tab.label} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="ml-auto w-full sm:w-[200px]">
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger>
                <SelectValue placeholder="すべてのプロジェクト" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべてのプロジェクト</SelectItem>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {groupedTasks.overdue.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-destructive flex items-center gap-2">
              期限切れ ({groupedTasks.overdue.length})
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groupedTasks.overdue.map((task) => (
                <TaskCard
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  description={task.description}
                  status={task.status}
                  priority={task.priority}
                  dueDate={task.dueDate}
                  assignee={task.assignee}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {groupedTasks.today.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-orange-500 flex items-center gap-2">
              今日が期限 ({groupedTasks.today.length})
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groupedTasks.today.map((task) => (
                <TaskCard
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  description={task.description}
                  status={task.status}
                  priority={task.priority}
                  dueDate={task.dueDate}
                  assignee={task.assignee}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {groupedTasks.upcoming.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              今後の予定 ({groupedTasks.upcoming.length})
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groupedTasks.upcoming.map((task) => (
                <TaskCard
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  description={task.description}
                  status={task.status}
                  priority={task.priority}
                  dueDate={task.dueDate}
                  assignee={task.assignee}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {groupedTasks.noDueDate.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              期限なし ({groupedTasks.noDueDate.length})
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groupedTasks.noDueDate.map((task) => (
                <TaskCard
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  description={task.description}
                  status={task.status}
                  priority={task.priority}
                  dueDate={task.dueDate}
                  assignee={task.assignee}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {tasks && tasks.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p>あなたに割り当てられたタスクはありません</p>
          </div>
        )}

        <TaskDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleSubmit}
          initialData={editingTask}
          projects={projects || []}
          users={users || []}
        />
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteMutation.mutate({ id: deleteTargetId });
          }
        }}
        isPending={deleteMutation.isPending}
      />
    </AppLayout>
  );
}
