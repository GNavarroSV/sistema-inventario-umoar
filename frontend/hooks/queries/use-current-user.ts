'use client';

import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../config/api';
import { useAuthContext } from '../../contexts/auth-context';
import type { ApiUser } from '../../types/auth';

async function fetchCurrentUser(token: string) {
  return apiRequest<{ message: string; user: ApiUser }>('/profile', {
    method: 'GET',
    token,
  });
}

export function useCurrentUserQuery() {
  const auth = useAuthContext();

  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      if (!auth.session?.accessToken) {
        throw new Error('No autenticado');
      }

      return fetchCurrentUser(auth.session.accessToken);
    },
    enabled: auth.isAuthenticated,
  });
}
