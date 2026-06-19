'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../config/api';
import { useAuthContext } from '../../contexts/auth-context';

export interface RoleMenuDto {
  menu: {
    id: number;
    name: string;
    label: string;
    path: string;
    icon?: string | null;
    order?: number;
  };
}

export interface RoleDto {
  id: number;
  name: string;
  type: string;
  description?: string | null;
  menus?: RoleMenuDto[];
  users?: Array<{
    id: number;
    name: string;
    email: string;
  }>;
}

export interface CreateRoleDto {
  name: string;
  type: string;
  description?: string;
}

async function fetchRoles(token: string) {
  return apiRequest<RoleDto[]>('/roles', {
    method: 'GET',
    token,
  });
}

async function createRole(token: string, data: CreateRoleDto) {
  return apiRequest<RoleDto>('/roles', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

export function useRolesQuery() {
  const auth = useAuthContext();

  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return fetchRoles(auth.session.accessToken);
    },
    enabled: auth.isAuthenticated,
  });
}

export function useCreateRoleMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRoleDto) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return createRole(auth.session.accessToken, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}