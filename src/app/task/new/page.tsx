import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { redirect } from 'next/navigation';
import { Container } from '@mui/material';
import { TaskForm } from './_components/task-form';
import { createCaller } from '@/trpc/server';

export default async function NewTaskPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const trpc = await createCaller();
  const [projects, users] = await Promise.all([
    trpc.project.getAll({}),
    trpc.user.getAll(),
  ]);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <TaskForm 
        projects={projects} 
        users={users}
        currentUserId={session.user.id}
      />
    </Container>
  );
}