'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api } from '@/trpc/react';

export default function HomePage() {
  const { data: session, isLoading } = api.auth.getSession.useQuery();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        router.push('/login');
      } else {
        router.push('/dashboard');
      }
    }
  }, [session, isLoading, router]);

  return null;
}
