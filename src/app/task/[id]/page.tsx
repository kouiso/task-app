import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { redirect } from 'next/navigation';
import { Container } from '@mui/material';
import { TaskDetail } from './_components/task-detail';
import { createCaller } from '@/trpc/server';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const trpc = await createCaller();
  const [task, comments] = await Promise.all([
    trpc.task.getById({ id }),
    trpc.comment.getByTaskId({ taskId: id }),
  ]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <TaskDetail 
        task={task}
        comments={comments}
        currentUserId={session.user.id}
      />
    </Container>
  );
}