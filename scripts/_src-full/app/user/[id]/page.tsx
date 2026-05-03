import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { UserDetailClient } from './user-detail-client';

interface UserDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!user) {
    notFound();
  }

  return <UserDetailClient userId={id} />;
}
