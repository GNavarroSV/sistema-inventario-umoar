'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../config/api';
import { useAuthContext } from '../../contexts/auth-context';

export type CategoryOption = {
  id: number;
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export interface CreateCategoryDto {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

async function fetchCategories(token: string, isActive?: boolean) {
  const query = typeof isActive === 'boolean' ? `?isActive=${isActive}` : '';

  return apiRequest<CategoryOption[]>(`/categories${query}`, {
    method: 'GET',
    token,
  });
}

async function createCategory(token: string, data: CreateCategoryDto) {
  return apiRequest<CategoryOption>('/categories', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

async function updateCategory(token: string, id: number, data: UpdateCategoryDto) {
  return apiRequest<CategoryOption>(`/categories/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

async function deleteCategory(token: string, id: number) {
  return apiRequest<CategoryOption>(`/categories/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function useCategoriesQuery(isActive?: boolean) {
  const auth = useAuthContext();

  return useQuery({
    queryKey: ['categories', isActive],
    queryFn: async () => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return fetchCategories(auth.session.accessToken, isActive);
    },
    enabled: auth.isAuthenticated,
  });
}

export function useCreateCategoryMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCategoryDto) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return createCategory(auth.session.accessToken, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategoryMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateCategoryDto }) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return updateCategory(auth.session.accessToken, id, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useDeleteCategoryMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return deleteCategory(auth.session.accessToken, id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
