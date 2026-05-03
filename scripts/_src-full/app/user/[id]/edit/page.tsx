import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { UserEditClient } from './user-edit-client';

interface UserEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserEditPage({ params }: UserEditPageProps) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!user) {
    notFound();
  }

  return <UserEditClient userId={id} />;
}
