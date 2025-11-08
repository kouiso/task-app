'use client';

import { api } from '@/trpc/react';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { data: session, isLoading } = api.auth.getSession.useQuery();

  useEffect(() => {
    if (!isLoading) {
      if (!session) {
        redirect('/login');
      } else {
        redirect('/dashboard');
      }
    }
  }, [session, isLoading]);

  return null;
}
