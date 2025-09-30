import { api } from '@/lib/trpc/client';

export function useCurrentUser() {
  const { data: user, isLoading } = api.user.getProfile.useQuery();
  
  return {
    user,
    isLoading,
    isAdmin: user?.role === 'ADMIN',
  };
}