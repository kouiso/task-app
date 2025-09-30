import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Container } from '@mui/material';
import { authOptions } from '@/server/auth';
import { createCaller } from '@/trpc/server';
import { ReportDashboard } from './_components/report-dashboard';

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const trpc = await createCaller();
  
  const [tasksData, projects, users] = await Promise.all([
    trpc.task.getAll({ limit: 1000 }),
    trpc.project.getAll({}),
    trpc.user.getAll(),
  ]);

  const stats = {
    totalTasks: tasksData.total,
    todoTasks: tasksData.tasks.filter(t => t.status === 'TODO').length,
    inProgressTasks: tasksData.tasks.filter(t => t.status === 'IN_PROGRESS').length,
    doneTasks: tasksData.tasks.filter(t => t.status === 'DONE').length,
    cancelledTasks: tasksData.tasks.filter(t => t.status === 'CANCELLED').length,
    urgentTasks: tasksData.tasks.filter(t => t.priority === 'URGENT').length,
    highTasks: tasksData.tasks.filter(t => t.priority === 'HIGH').length,
    mediumTasks: tasksData.tasks.filter(t => t.priority === 'MEDIUM').length,
    lowTasks: tasksData.tasks.filter(t => t.priority === 'LOW').length,
    overdueTasks: tasksData.tasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length,
    totalTimeSpent: tasksData.tasks.reduce((sum, t) => sum + (t.timeSpentMinutes || 0), 0),
    totalEstimatedHours: tasksData.tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0),
  };

  const tasksByProject = projects.map(project => ({
    project,
    tasks: tasksData.tasks.filter(t => t.projectId === project.id),
  }));

  const tasksByUser = users.map(user => ({
    user,
    assignedTasks: tasksData.tasks.filter(t => t.assigneeId === user.id),
    createdTasks: tasksData.tasks.filter(t => t.createdById === user.id),
  }));

  return (
    <Container maxWidth="xl">
      <ReportDashboard 
        tasks={tasksData.tasks}
        stats={stats}
        tasksByProject={tasksByProject}
        tasksByUser={tasksByUser}
        projects={projects}
        users={users}
        currentUserName={session.user.name || session.user.email || 'ユーザー'}
      />
    </Container>
  );
}