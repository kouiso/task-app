import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Container } from '@mui/material';
import { authOptions } from '@/server/auth';
import { createCaller } from '@/trpc/server';
import { UserManagement } from './_components/user-management';

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const trpc = await createCaller();
  const currentUser = await trpc.user.getProfile();
  
  if (currentUser?.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const users = await trpc.user.getAll();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <UserManagement users={users} currentUserId={session.user.id} />
    </Container>
  );
}