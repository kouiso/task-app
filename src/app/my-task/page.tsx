'use client';

import { AppLayout } from '@/component/layout/app-layout';
import { TaskCard } from '@/component/task/task-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/component/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/component/ui/tabs';
import { api } from '@/trpc/react';
import type { TaskStatus } from '@prisma/client';
import { useState } from 'react';

const STATUS_TABS: { label: string; value: TaskStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'To Do', value: 'TODO' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'In Review', value: 'IN_REVIEW' },
  { label: 'Done', value: 'DONE' },
];

export default function MyTasksPage() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');

  const { data: currentUser } = api.user.getCurrentUser.useQuery();
  const { data: projects } = api.project.getAll.useQuery();
  const { data: tasks, isLoading } = api.task.getAll.useQuery(
    {
      assigneeId: currentUser?.id,
      status: activeTab === 'all' ? undefined : (activeTab as TaskStatus),
      projectId: filterProject === 'all' ? undefined : filterProject,
    },
    { enabled: !!currentUser },
  );

  const groupedTasks = {
    overdue: tasks?.filter((t) => t.dueDate && new Date(t.dueDate) < new Date()) || [],
    today:
      tasks?.filter((t) => {
        if (!t.dueDate) return false;
        const today = new Date();
        const dueDate = new Date(t.dueDate);
        return dueDate.toDateString() === today.toDateString();
      }) || [],
    upcoming:
      tasks?.filter((t) => {
        if (!t.dueDate) return false;
        const today = new Date();
        const dueDate = new Date(t.dueDate);
        return dueDate > today && dueDate.toDateString() !== today.toDateString();
      }) || [],
    noDueDate: tasks?.filter((t) => !t.dueDate) || [],
  };

  if (isLoading) {
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
        <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
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
        </div>

        {groupedTasks.overdue.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-destructive flex items-center gap-2">
              Overdue ({groupedTasks.overdue.length})
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
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              ))}
            </div>
          </div>
        )}

        {groupedTasks.today.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-orange-500 flex items-center gap-2">
              Due Today ({groupedTasks.today.length})
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
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              ))}
            </div>
          </div>
        )}

        {groupedTasks.upcoming.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Upcoming ({groupedTasks.upcoming.length})
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
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              ))}
            </div>
          </div>
        )}

        {groupedTasks.noDueDate.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              No Due Date ({groupedTasks.noDueDate.length})
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
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              ))}
            </div>
          </div>
        )}

        {tasks && tasks.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <p>No tasks assigned to you</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
