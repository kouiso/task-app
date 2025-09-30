import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Container } from '@mui/material';
import { authOptions } from '@/server/auth';
import { createCaller } from '@/trpc/server';
import { Dashboard } from './_components/dashboard';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const trpc = await createCaller();
  
  const [tasksData, projects] = await Promise.all([
    trpc.task.getAll({}),
    trpc.project.getAll({}),
  ]);

  const stats = {
    totalTasks: tasksData.total,
    todoTasks: tasksData.tasks.filter(t => t.status === 'TODO').length,
    inProgressTasks: tasksData.tasks.filter(t => t.status === 'IN_PROGRESS').length,
    doneTasks: tasksData.tasks.filter(t => t.status === 'DONE').length,
    totalProjects: projects.length,
    urgentTasks: tasksData.tasks.filter(t => t.priority === 'URGENT').length,
    overdueTasks: tasksData.tasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length,
    totalTimeSpent: tasksData.tasks.reduce((sum, t) => sum + (t.timeSpentMinutes || 0), 0),
  };

  const recentTasks = tasksData.tasks
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const tasksByProject = projects.map(project => ({
    project,
    tasks: tasksData.tasks.filter(t => t.projectId === project.id),
  }));

  return (
    <Container maxWidth="lg">
      <Dashboard 
        stats={stats}
        recentTasks={recentTasks}
        tasksByProject={tasksByProject}
        currentUserName={session.user.name || session.user.email || 'ユーザー'}
      />
    </Container>
  );
}
