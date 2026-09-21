import { getTRPCErrorFromUnknown } from '@trpc/server';
import { notFound, redirect } from 'next/navigation';
import { AppLayout } from '@/component/layout/app-layout';
import { Card, CardContent } from '@/component/ui/card';
import { trpc } from '@/trpc/server';
import { UserEditClient } from './user-edit-client';

interface UserEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function UserEditPage({ params }: UserEditPageProps) {
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
          <div className="container mx-auto max-w-md mt-8">
            <Card>
              <CardContent className="pt-6">
                <h1 className="text-xl font-bold mb-2">アクセス権限がありません</h1>
                <p className="text-muted-foreground">管理者または本人のみユーザー編集が可能です</p>
              </CardContent>
            </Card>
          </div>
        </AppLayout>
      );
    }
    throw error;
  }

  return <UserEditClient userId={id} />;
}
