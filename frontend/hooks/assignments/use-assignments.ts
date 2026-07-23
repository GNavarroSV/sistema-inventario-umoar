'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../config/api';
import { useAuthContext } from '../../contexts/auth-context';

export type AssignmentPersonDto = {
  id: number;
  name: string;
  email?: string | null;
  documentNumber?: string | null;
};

export type AssignmentAssetDto = {
  id: number;
  code: string;
  name: string;
  status: string;
};

export type AssignmentUserDto = {
  id: number;
  name: string;
  email: string;
};

export type AssignmentDto = {
  id: number;
  assetId: number;
  assignedToPersonId: number;
  assignedByUserId?: number | null;
  previousResponsiblePersonId?: number | null;
  type: 'CUSTODY' | 'LOAN';
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'CANCELLED';
  quantity: number;
  startDate: string;
  dueDate?: string | null;
  returnDate?: string | null;
  reason?: string | null;
  notes?: string | null;
  documentUrl?: string | null;
  documentPublicId?: string | null;
  asset: AssignmentAssetDto;
  assignedToPerson: AssignmentPersonDto;
  previousResponsiblePerson?: AssignmentPersonDto | null;
  assignedByUser?: AssignmentUserDto | null;
};

export interface CreateAssignmentDto {
  assetId: number;
  assignedToPersonId: number;
  assignedByUserId?: number;
  type: 'CUSTODY' | 'LOAN';
  status?: 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'CANCELLED';
  startDate?: string;
  dueDate?: string;
  returnDate?: string;
  reason?: string;
  notes?: string;
}

export interface TransferSourceDto {
  assignmentId: number;
  quantity: number;
}

export interface CreateTransferDto {
  assetId: number;
  toPersonId: number;
  assignedByUserId?: number;
  quantity: number;
  type: 'CUSTODY' | 'LOAN';
  dueDate?: string;
  reason?: string;
  notes?: string;
  documentUrl?: string;
  documentPublicId?: string;
  sources?: TransferSourceDto[];
}

export interface MarkAssignmentReturnedDto {
  returnDate?: string;
  restorePreviousCustody?: boolean;
  notes?: string;
}

export interface AssetDistributionDto {
  assetId: number;
  assetCode: string;
  assetName: string;
  totalQuantity: number;
  assignedQuantity: number;
  unassigned: number;
  assignments: {
    assignmentId: number;
    personId: number;
    personName: string;
    personEmail?: string | null;
    quantity: number;
    type: string;
    status: string;
    startDate: string;
    dueDate?: string | null;
  }[];
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

export interface AssignmentListParams {
  skip?: number;
  take?: number;
  asset?: string;
  person?: string;
  quantity?: string;
  type?: string;
  dueDate?: string;
  status?: string;
  document?: string;
}

export interface AssignmentListResponse {
  data: AssignmentDto[];
  total: number;
}

async function fetchAssignments(token: string, params?: AssignmentListParams) {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return apiRequest<AssignmentListResponse>(`/assignments${query ? `?${query}` : ''}`, { method: 'GET', token });
}

async function createAssignment(token: string, data: CreateAssignmentDto) {
  return apiRequest<AssignmentDto>('/assignments', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

async function createTransfer(token: string, data: CreateTransferDto) {
  return apiRequest<AssignmentDto>('/assignments/transfer', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

async function fetchDistribution(token: string, assetId: number) {
  return apiRequest<AssetDistributionDto>(`/assignments/distribution/${assetId}`, {
    method: 'GET',
    token,
  });
}

async function markReturned(token: string, id: number, data: MarkAssignmentReturnedDto) {
  return apiRequest<AssignmentDto>(`/assignments/${id}/return`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

async function uploadDocument(token: string, file: File): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')}/uploads`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => null);
    throw new Error(err?.message ?? 'Error al subir el archivo');
  }

  return response.json();
}

export function useAssignmentsQuery(params?: AssignmentListParams) {
  const auth = useAuthContext();
  return useQuery({
    queryKey: ['assignments', params],
    queryFn: async () => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return fetchAssignments(auth.session.accessToken, params);
    },
    enabled: auth.isAuthenticated,
  });
}

export function useAssetDistributionQuery(assetId?: number) {
  const auth = useAuthContext();
  return useQuery({
    queryKey: ['assignments', 'distribution', assetId],
    queryFn: async () => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      if (!assetId) throw new Error('assetId requerido');
      return fetchDistribution(auth.session.accessToken, assetId);
    },
    enabled: auth.isAuthenticated && Boolean(assetId),
  });
}

export function useCreateTransferMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTransferDto) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return createTransfer(auth.session.accessToken, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useUploadDocumentMutation() {
  const auth = useAuthContext();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return uploadDocument(auth.session.accessToken, file);
    },
  });
}

export function useCreateAssignmentMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAssignmentDto) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return createAssignment(auth.session.accessToken, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useMarkAssignmentReturnedMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: MarkAssignmentReturnedDto }) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return markReturned(auth.session.accessToken, id, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}
