'use client';

import { AppLayout } from '@/component/layout/app-layout';
import { TaskCard } from '@/component/task/task-card';
import { TaskDialog, type TaskFormData } from '@/component/task/task-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/component/ui/avatar';
import { Badge } from '@/component/ui/badge';
import { Button } from '@/component/ui/button';
import { Checkbox } from '@/component/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/component/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/component/ui/dropdown-menu';
import { Label } from '@/component/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/component/ui/select';
import { Separator } from '@/component/ui/separator';
import { Textarea } from '@/component/ui/textarea';
import { api } from '@/trpc/react';
import type { TaskStatus } from '@prisma/client';
import { CheckSquare, Plus, Trash2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function TaskPageContent() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TaskFormData | undefined>(undefined);
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [commentContent, setCommentContent] = useState('');

  const searchParams = useSearchParams();
  const taskIdParam = searchParams.get('taskId');

  useEffect(() => {
    if (taskIdParam) {
      setSelectedTask(taskIdParam);
      setDetailOpen(true);
    }
  }, [taskIdParam]);

  const utils = api.useUtils();

  const { data: session } = api.auth.getSession.useQuery();
  const { data: tasks, isLoading: tasksLoading } = api.task.getAll.useQuery(
    {
      projectId: filterProject === 'all' ? undefined : filterProject,
      status: filterStatus === 'all' ? undefined : filterStatus,
    },
    { refetchOnWindowFocus: false },
  );

  const { data: projects } = api.project.getAll.useQuery();
  const { data: users } = api.user.getAll.useQuery();
  const { data: taskDetail } = api.task.getById.useQuery(
    { id: selectedTask ?? '' },
    { enabled: !!selectedTask },
  );

  const createMutation = api.task.create.useMutation({
    onSuccess: () => {
      utils.task.getAll.invalidate();
      setDialogOpen(false);
    },
  });

  const updateMutation = api.task.update.useMutation({
    onSuccess: () => {
      utils.task.getAll.invalidate();
      if (selectedTask) {
        utils.task.getById.invalidate({ id: selectedTask });
      }
      setDialogOpen(false);
    },
  });

  const deleteMutation = api.task.delete.useMutation({
    onSuccess: () => {
      utils.task.getAll.invalidate();
    },
  });

  const bulkCompleteMutation = api.task.bulkComplete.useMutation({
    onSuccess: () => {
      utils.task.getAll.invalidate();
      setSelectedTasks(new Set());
    },
  });

  const bulkDeleteMutation = api.task.bulkDelete.useMutation({
    onSuccess: () => {
      utils.task.getAll.invalidate();
      setSelectedTasks(new Set());
    },
  });

  const bulkUpdateStatusMutation = api.task.bulkUpdateStatus.useMutation({
    onSuccess: () => {
      utils.task.getAll.invalidate();
      setSelectedTasks(new Set());
    },
  });

  const createCommentMutation = api.comment.create.useMutation({
    onSuccess: () => {
      if (selectedTask) {
        utils.task.getById.invalidate({ id: selectedTask });
      }
      setCommentContent('');
    },
  });

  const handleCreate = () => {
    setEditingTask(undefined);
    setDialogOpen(true);
  };

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
    if (confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate({ id: taskId });
    }
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
        estimatedHours: data.estimatedHours || null,
        assigneeId: data.assigneeId || null,
      });
    } else {
      if (!session?.user?.id) {
        console.error('No user session found');
        return;
      }
      createMutation.mutate({
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
        estimatedHours: data.estimatedHours,
        projectId: data.projectId,
        createdById: session.user.id,
        assigneeId: data.assigneeId || undefined,
      });
    }
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTask(taskId);
    setDetailOpen(true);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setSelectedTask(null);
    setCommentContent('');
  };

  const handleCommentSubmit = () => {
    if (!commentContent.trim() || !selectedTask || !session?.user?.id) return;

    createCommentMutation.mutate({
      content: commentContent.trim(),
      taskId: selectedTask,
      userId: session.user.id,
    });
  };

  const handleTaskSelect = (taskId: string, checked: boolean) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      checked ? next.add(taskId) : next.delete(taskId);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedTasks(checked ? new Set(tasks?.map((t) => t.id) || []) : new Set());
  };

  const handleBulkComplete = () => {
    if (selectedTasks.size > 0) {
      bulkCompleteMutation.mutate({ ids: Array.from(selectedTasks) });
    }
  };

  const handleBulkDelete = () => {
    if (selectedTasks.size > 0 && confirm(`Delete ${selectedTasks.size} tasks?`)) {
      bulkDeleteMutation.mutate({ ids: Array.from(selectedTasks) });
    }
  };

  const handleBulkUpdateStatus = (status: TaskStatus) => {
    if (selectedTasks.size > 0) {
      bulkUpdateStatusMutation.mutate({ ids: Array.from(selectedTasks), status });
    }
  };

  if (tasksLoading) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
            {selectedTasks.size > 0 && (
              <span className="text-sm text-muted-foreground">({selectedTasks.size} selected)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedTasks.size > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={handleBulkComplete}>
                  <CheckSquare className="mr-2 h-4 w-4" /> Complete
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Change Status
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleBulkUpdateStatus('TODO')}>
                      To Do
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdateStatus('IN_PROGRESS')}>
                      In Progress
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdateStatus('IN_REVIEW')}>
                      In Review
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdateStatus('DONE')}>
                      Done
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdateStatus('CANCELLED')}>
                      Cancelled
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkUpdateStatus('BLOCKED')}>
                      Blocked
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={handleBulkDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </>
            )}
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" /> New Task
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center mb-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={!!(tasks && tasks.length > 0 && selectedTasks.size === tasks.length)}
              onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
            />
            <Label htmlFor="select-all">Select All</Label>
          </div>

          <div className="flex gap-2 w-full sm:w-auto ml-auto">
            <div className="w-[200px]">
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[200px]">
              <Select
                value={filterStatus}
                onValueChange={(value) => setFilterStatus(value as TaskStatus | 'all')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="IN_REVIEW">In Review</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tasks && tasks.length > 0 ? (
            tasks.map((task) => (
              <div key={task.id} className="flex gap-2 items-start h-full">
                <Checkbox
                  checked={selectedTasks.has(task.id)}
                  onCheckedChange={(checked) => handleTaskSelect(task.id, checked as boolean)}
                  className="mt-4"
                />
                <div className="flex-1 min-w-0 h-full">
                  <TaskCard
                    id={task.id}
                    title={task.title}
                    description={task.description}
                    status={task.status}
                    priority={task.priority}
                    dueDate={task.dueDate}
                    assignee={task.assignee}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onClick={handleTaskClick}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <p>No tasks found.</p>
              <p>Create your first task to get started!</p>
            </div>
          )}
        </div>

        <TaskDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSubmit={handleSubmit}
          initialData={editingTask}
          projects={projects || []}
          users={users || []}
          currentUserId={session?.user?.id || ''}
        />

        <Dialog open={detailOpen} onOpenChange={(isOpen) => !isOpen && handleDetailClose()}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">{taskDetail?.title}</DialogTitle>
              <DialogDescription>
                In Project:{' '}
                <span className="font-semibold text-foreground">{taskDetail?.project.name}</span>
              </DialogDescription>
            </DialogHeader>

            {taskDetail && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {taskDetail.description || 'No description provided.'}
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Status</span>
                    <Badge variant="outline">{taskDetail.status}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Priority</span>
                    <Badge variant="outline">{taskDetail.priority}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Assignee</span>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={taskDetail.assignee?.avatar || ''} />
                        <AvatarFallback className="text-[10px]">
                          {(taskDetail.assignee?.name ||
                            taskDetail.assignee?.email ||
                            '?')[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {taskDetail.assignee?.name || taskDetail.assignee?.email || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Due Date</span>
                    <span>
                      {taskDetail.dueDate
                        ? new Date(taskDetail.dueDate).toLocaleDateString()
                        : 'No due date'}
                    </span>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-semibold">Comments</h3>
                    <Badge variant="secondary" className="rounded-full px-2">
                      {taskDetail.comments?.length || 0}
                    </Badge>
                  </div>

                  <div className="space-y-4 mb-4 max-h-[200px] overflow-y-auto pr-2">
                    {taskDetail.comments?.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        No comments yet.
                      </p>
                    )}
                    {taskDetail.comments?.map((comment) => (
                      <div key={comment.id} className="flex gap-3 text-sm">
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarImage src={comment.user.avatar || ''} />
                          <AvatarFallback>
                            {(comment.user.name || comment.user.email || '?')[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              {comment.user.name || comment.user.email}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      className="resize-none"
                      rows={2}
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleCommentSubmit}
                        disabled={!commentContent.trim() || createCommentMutation.isPending}
                      >
                        {createCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleDetailClose}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

export default function TaskPage() {
  return (
    <Suspense
      fallback={
        <AppLayout>
          <div className="flex h-[60vh] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </AppLayout>
      }
    >
      <TaskPageContent />
    </Suspense>
  );
}
