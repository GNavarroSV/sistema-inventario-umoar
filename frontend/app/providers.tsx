'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '../contexts/auth-context';
import { QueryProvider } from '../contexts/query-provider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>{children}</AuthProvider>
    </QueryProvider>
  );
}
