import { getServerSession } from 'next-auth';
import { authOptions } from '@/server/auth';
import { redirect } from 'next/navigation';

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  return (
    <div>
      <h1>プロジェクト管理</h1>
      <p>準備中...</p>
    </div>
  );
}