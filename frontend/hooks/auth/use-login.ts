'use client';

import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '../../config/api';
import { useAuthContext } from '../../contexts/auth-context';
import type { LoginPayload, LoginResponse } from '../../types/auth';

async function loginRequest(payload: LoginPayload) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function useLogin() {
  const auth = useAuthContext();

  return useMutation({
    mutationFn: loginRequest,
    onSuccess: (response) => {
      auth.setSessionFromLogin(response);
    },
  });
}
