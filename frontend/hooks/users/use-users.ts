'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../config/api';
import { useAuthContext } from '../../contexts/auth-context';

export interface UserRoleDto {
  id: number;
  name: string;
  type: string;
}

export interface UserDto {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  role: UserRoleDto;
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  roleId?: number;
}

export interface UpdateUserRoleDto {
  roleId: number;
}

export interface UpdateUserStatusDto {
  isActive: boolean;
}

export interface UpdateUserPasswordDto {
  password: string;
}

async function fetchUsers(token: string) {
  return apiRequest<UserDto[]>('/users', {
    method: 'GET',
    token,
  });
}

async function createUser(token: string, data: CreateUserDto) {
  return apiRequest<UserDto>('/users', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

async function updateUserRole(token: string, userId: number, data: UpdateUserRoleDto) {
  return apiRequest<UserDto>(`/users/${userId}/role`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

async function updateUserStatus(token: string, userId: number, data: UpdateUserStatusDto) {
  return apiRequest<UserDto>(`/users/${userId}/status`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

async function updateUserPassword(token: string, userId: number, data: UpdateUserPasswordDto) {
  return apiRequest<UserDto>(`/users/${userId}/password`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

export function useUsersQuery() {
  const auth = useAuthContext();

  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return fetchUsers(auth.session.accessToken);
    },
    enabled: auth.isAuthenticated,
  });
}

export function useCreateUserMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserDto) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return createUser(auth.session.accessToken, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUserRoleMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, roleId }: { userId: number; roleId: number }) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return updateUserRole(auth.session.accessToken, userId, { roleId });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      await queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
  });
}

export function useUpdateUserStatusMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return updateUserStatus(auth.session.accessToken, userId, { isActive });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUserPasswordMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, password }: { userId: number; password: string }) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return updateUserPassword(auth.session.accessToken, userId, { password });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
