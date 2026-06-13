'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../config/api';
import { useAuthContext } from '../../contexts/auth-context';

export type PersonOption = {
  id: number;
  name: string;
  email?: string | null;
  documentNumber?: string | null;
  phone?: string | null;
  isActive?: boolean;
};

export interface CreatePersonDto {
  name: string;
  email?: string;
  documentNumber?: string;
  phone?: string;
  isActive?: boolean;
}

export interface UpdatePersonDto extends Partial<CreatePersonDto> {}

async function fetchPeople(token: string, isActive?: boolean) {
  const query = typeof isActive === 'boolean' ? `?isActive=${isActive}` : '';

  return apiRequest<PersonOption[]>(`/people${query}`, {
    method: 'GET',
    token,
  });
}

async function createPerson(token: string, data: CreatePersonDto) {
  return apiRequest<PersonOption>('/people', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

async function updatePerson(token: string, id: number, data: UpdatePersonDto) {
  return apiRequest<PersonOption>(`/people/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

async function deletePerson(token: string, id: number) {
  return apiRequest<PersonOption>(`/people/${id}`, {
    method: 'DELETE',
    token,
  });
}

export function usePeopleQuery(isActive?: boolean) {
  const auth = useAuthContext();

  return useQuery({
    queryKey: ['people', isActive],
    queryFn: async () => {
      if (!auth.session?.accessToken) {
        throw new Error('No autenticado');
      }

      return fetchPeople(auth.session.accessToken, isActive);
    },
    enabled: auth.isAuthenticated,
  });
}

export function useCreatePersonMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePersonDto) => {
      if (!auth.session?.accessToken) {
        throw new Error('No autenticado');
      }

      return createPerson(auth.session.accessToken, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['people'] });
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useUpdatePersonMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdatePersonDto }) => {
      if (!auth.session?.accessToken) {
        throw new Error('No autenticado');
      }

      return updatePerson(auth.session.accessToken, id, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['people'] });
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useDeletePersonMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      if (!auth.session?.accessToken) {
        throw new Error('No autenticado');
      }

      return deletePerson(auth.session.accessToken, id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['people'] });
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
