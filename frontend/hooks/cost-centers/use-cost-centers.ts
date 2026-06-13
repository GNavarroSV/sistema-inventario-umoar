'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../config/api';
import { useAuthContext } from '../../contexts/auth-context';

export type CostCenterOption = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};

export interface CreateCostCenterDto {
  code: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateCostCenterDto extends Partial<CreateCostCenterDto> {}

async function fetchCostCenters(token: string, isActive?: boolean) {
  const query = typeof isActive === 'boolean' ? `?isActive=${isActive}` : '';

  return apiRequest<CostCenterOption[]>(`/cost-centers${query}`, {
    method: 'GET',
    token,
  });
}

async function createCostCenter(token: string, data: CreateCostCenterDto) {
  return apiRequest<CostCenterOption>('/cost-centers', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

async function updateCostCenter(token: string, id: number, data: UpdateCostCenterDto) {
  return apiRequest<CostCenterOption>(`/cost-centers/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

async function deleteCostCenter(token: string, id: number) {
  return apiRequest<CostCenterOption>(`/cost-centers/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function useCostCentersQuery(isActive?: boolean) {
  const auth = useAuthContext();

  return useQuery({
    queryKey: ['cost-centers', isActive],
    queryFn: async () => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return fetchCostCenters(auth.session.accessToken, isActive);
    },
    enabled: auth.isAuthenticated,
  });
}

export function useCreateCostCenterMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCostCenterDto) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return createCostCenter(auth.session.accessToken, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
    },
  });
}

export function useUpdateCostCenterMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateCostCenterDto }) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return updateCostCenter(auth.session.accessToken, id, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
    },
  });
}

export function useDeleteCostCenterMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return deleteCostCenter(auth.session.accessToken, id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cost-centers'] });
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}