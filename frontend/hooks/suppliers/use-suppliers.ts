'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../config/api';
import { useAuthContext } from '../../contexts/auth-context';

export type SupplierOption = {
  id: number;
  name: string;
  taxId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive?: boolean;
};

export type SupplierPayload = {
  name: string;
  taxId?: string;
  isActive?: boolean;
};

async function fetchSuppliers(token: string, isActive?: boolean) {
  const query = typeof isActive === 'boolean' ? `?isActive=${isActive}` : '';
  return apiRequest<SupplierOption[]>(`/suppliers${query}`, {
    method: 'GET',
    token,
  });
}

async function createSupplier(token: string, data: SupplierPayload) {
  return apiRequest<SupplierOption>('/suppliers', { method: 'POST', token, body: JSON.stringify(data) });
}

async function updateSupplier(token: string, id: number, data: Partial<SupplierPayload>) {
  return apiRequest<SupplierOption>(`/suppliers/${id}`, { method: 'PATCH', token, body: JSON.stringify(data) });
}

async function deleteSupplier(token: string, id: number) {
  return apiRequest<SupplierOption>(`/suppliers/${id}`, { method: 'DELETE', token });
}

export function useSuppliersQuery(isActive?: boolean) {
  const auth = useAuthContext();

  return useQuery({
    queryKey: ['suppliers', isActive],
    queryFn: async () => {
      if (!auth.session?.accessToken) {
        throw new Error('No autenticado');
      }

      return fetchSuppliers(auth.session.accessToken, isActive);
    },
    enabled: auth.isAuthenticated,
  });
}

export function useCreateSupplierMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SupplierPayload) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return createSupplier(auth.session.accessToken, data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useUpdateSupplierMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SupplierPayload> }) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return updateSupplier(auth.session.accessToken, id, data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useDeleteSupplierMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return deleteSupplier(auth.session.accessToken, id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
