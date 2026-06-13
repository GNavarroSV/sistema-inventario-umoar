'use client';

import { useRouter } from 'next/navigation';
import { useAuthContext } from '../../contexts/auth-context';

export function useLogout() {
  const router = useRouter();
  const auth = useAuthContext();

  return () => {
    auth.clearSession();
    router.replace('/');
  };
}
