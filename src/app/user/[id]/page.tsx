import { getTRPCErrorFromUnknown } from '@trpc/server';
import { notFound, redirect } from 'next/navigation';
import { AppLayout } from '@/component/layout/app-layout';
import { Card, CardContent } from '@/component/ui/card';
import { trpc } from '@/trpc/server';
import { UserDetailClient } from './user-detail-client';

interface UserDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params;

  try {
    await trpc.user.getById({ id });
  } catch (error) {
    const trpcError = getTRPCErrorFromUnknown(error);
    if (trpcError.code === 'UNAUTHORIZED') redirect('/login');
    if (trpcError.code === 'NOT_FOUND') notFound();
    if (trpcError.code === 'FORBIDDEN') {
      return (
        <AppLayout>
          <div className="container mx-auto max-w-6xl mt-8">
            <Card>
              <CardContent className="pt-6">
                <h1 className="text-2xl font-bold mb-2">アクセス権限がありません</h1>
                <p className="text-muted-foreground">このユーザーを見る権限がありません</p>
              </CardContent>
            </Card>
          </div>
        </AppLayout>
      );
    }
    throw error;
  }

  return <UserDetailClient userId={id} />;
}
