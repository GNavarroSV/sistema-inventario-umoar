'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../config/api';
import { useAuthContext } from '../../contexts/auth-context';

export interface AssetResponseDto {
  id: number;
  code: string;
  name: string;
  status: string;
  location: string;
  quantity: number;
  unitValue: number;
  acquisitionDate?: string | null;
  disposalDate?: string | null;
  costCenterId?: number | null;
  costCenter?: { id: number; code: string; name: string } | null;
  responsiblePerson: {
    id: number;
    name: string;
  };
  assignments?: AssetAssignmentDto[];
  history?: AssetHistoryDto[];
  stockMovements?: AssetStockMovementDto[];
}

export interface AssetAssignmentDto {
  id: number;
  assetId: number;
  assignedToPersonId: number;
  assignedByUserId?: number | null;
  previousResponsiblePersonId?: number | null;
  type: string;
  status: string;
  quantity: number;
  startDate: string;
  dueDate?: string | null;
  returnDate?: string | null;
  reason?: string | null;
  notes?: string | null;
  documentUrl?: string | null;
  documentPublicId?: string | null;
  assignedToPerson: {
    id: number;
    name: string;
    email?: string | null;
    documentNumber?: string | null;
  };
  assignedByUser?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface CreateAssetDto {
  name: string;
  description?: string;
  categoryId: number;
  quantity?: number;
  responsiblePersonId: number;
  location: string;
  costCenterId?: number;
  acquisitionDate?: string;
  unitValue: number;
  supplierId?: number;
  invoiceNumber?: string;
  purchaseOrder?: string;
  warrantyEndDate?: string;
  warrantyMonths?: number;
  depreciationType?: string;
  depreciationRate?: number;
  depreciationMonths?: number;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
}

export interface UpdateAssetDto extends Omit<Partial<CreateAssetDto>, 'quantity'> {
  status?: string;
  condition?: string;
}

export interface UpdateAssetStatusDto {
  status: string;
  reason?: string;
}

export interface AssetHistoryDto {
  id: number;
  assetId: number;
  eventType: string;
  createdAt: string;
  changeReason?: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  previousUser?: string | null;
  newUser?: string | null;
  notes?: string | null;
  source?: string | null;
  changedByUser?: {
    id: number;
    name: string;
  } | null;
}

export interface AssetListParams {
  skip?: number;
  take?: number;
  status?: string;
  code?: string;
  name?: string;
  responsible?: string;
  location?: string;
  quantity?: string;
  unitValue?: string;
}

export interface AssetListResponse {
  data: AssetResponseDto[];
  total: number;
}

function buildQueryString(params?: Record<string, string | number | undefined> | AssetListParams) {
  if (!params) return '';
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function fetchAssets(token: string, params?: AssetListParams) {
  return apiRequest<AssetListResponse>('/assets' + buildQueryString(params), {
    method: 'GET',
    token,
  });
}

async function fetchAssetById(token: string, id: number) {
  return apiRequest<AssetResponseDto>(`/assets/${id}`, {
    method: 'GET',
    token,
  });
}

async function fetchAssetByCode(token: string, code: string) {
  return apiRequest(`/assets/code/${code}`, {
    method: 'GET',
    token,
  });
}

async function fetchAssetHistory(token: string, id: number) {
  return apiRequest<AssetHistoryDto[]>(`/assets/history/${id}`, {
    method: 'GET',
    token,
  });
}

async function fetchAssetStockMovements(token: string, id: number) {
  return apiRequest<AssetStockMovementDto[]>(`/assets/${id}/stock-movements`, {
    method: 'GET',
    token,
  });
}

async function createAssetStockMovement(
  token: string,
  id: number,
  data: CreateAssetStockMovementDto,
) {
  return apiRequest<AssetStockMovementDto>(`/assets/${id}/stock-movements`, {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

async function createAsset(token: string, data: CreateAssetDto) {
  return apiRequest('/assets', {
    method: 'POST',
    token,
    body: JSON.stringify(data),
  });
}

async function updateAsset(token: string, id: number, data: UpdateAssetDto) {
  return apiRequest(`/assets/${id}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

async function updateAssetStatus(token: string, id: number, data: UpdateAssetStatusDto) {
  return apiRequest(`/assets/${id}/status`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(data),
  });
}

async function discardAsset(token: string, id: number, disposalDate: string) {
  return apiRequest(`/assets/${id}/discard`, {
    method: 'POST',
    token,
    body: JSON.stringify({ disposalDate }),
  });
}

export function useAssetsQuery(params?: AssetListParams) {
  const auth = useAuthContext();

  return useQuery<AssetListResponse>({
    queryKey: ['assets', params],
    queryFn: async () => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return fetchAssets(auth.session.accessToken, params);
    },
    enabled: auth.isAuthenticated,
  });
}

export function useAssetQuery(id?: number) {
  const auth = useAuthContext();

  return useQuery<AssetResponseDto>({
    queryKey: ['assets', id],
    queryFn: async () => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      if (!id) throw new Error('ID requerido');
      return fetchAssetById(auth.session.accessToken, id);
    },
    enabled: auth.isAuthenticated && Boolean(id),
  });
}

export function useAssetByCodeQuery(code?: string) {
  const auth = useAuthContext();

  return useQuery({
    queryKey: ['assets', 'code', code],
    queryFn: async () => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      if (!code) throw new Error('Código requerido');
      return fetchAssetByCode(auth.session.accessToken, code);
    },
    enabled: auth.isAuthenticated && Boolean(code),
  });
}

export function useAssetHistoryQuery(id?: number) {
  const auth = useAuthContext();

  return useQuery<AssetHistoryDto[]>({
    queryKey: ['assets', 'history', id],
    queryFn: async () => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      if (!id) throw new Error('ID requerido');
      return fetchAssetHistory(auth.session.accessToken, id);
    },
    enabled: auth.isAuthenticated && Boolean(id),
  });
}

export function useAssetStockMovementsQuery(id?: number) {
  const auth = useAuthContext();

  return useQuery<AssetStockMovementDto[]>({
    queryKey: ['assets', id, 'stock-movements'],
    queryFn: async () => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      if (!id) throw new Error('ID requerido');
      return fetchAssetStockMovements(auth.session.accessToken, id);
    },
    enabled: auth.isAuthenticated && Boolean(id),
  });
}

export function useCreateAssetStockMovementMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: CreateAssetStockMovementDto;
    }) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return createAssetStockMovement(auth.session.accessToken, id, data);
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assets'] }),
        queryClient.invalidateQueries({ queryKey: ['assets', variables.id] }),
        queryClient.invalidateQueries({ queryKey: ['assets', variables.id, 'stock-movements'] }),
        queryClient.invalidateQueries({ queryKey: ['assets', 'history', variables.id] }),
        queryClient.invalidateQueries({ queryKey: ['assignments'] }),
      ]);
    },
  });
}

export function useCreateAssetMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateAssetDto) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return createAsset(auth.session.accessToken, data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
  });
}

export function useUpdateAssetMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateAssetDto }) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return updateAsset(auth.session.accessToken, id, data);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
      await queryClient.invalidateQueries({ queryKey: ['assets', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['assets', 'history', variables.id] });
    },
  });
}

export function useUpdateAssetStatusMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateAssetStatusDto;
    }) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return updateAssetStatus(auth.session.accessToken, id, data);
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
      await queryClient.invalidateQueries({ queryKey: ['assets', variables.id] });
      await queryClient.invalidateQueries({ queryKey: ['assets', 'history', variables.id] });
    },
  });
}

export function useDiscardAssetMutation() {
  const auth = useAuthContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, disposalDate }: { id: number; disposalDate: string }) => {
      if (!auth.session?.accessToken) throw new Error('No autenticado');
      return discardAsset(auth.session.accessToken, id, disposalDate);
    },
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['assets'] }),
        queryClient.invalidateQueries({ queryKey: ['assets', variables.id] }),
        queryClient.invalidateQueries({ queryKey: ['assets', variables.id, 'stock-movements'] }),
        queryClient.invalidateQueries({ queryKey: ['assignments'] }),
      ]);
    },
  });
}

export interface StockMovementSourceDto {
  assignmentId: number;
  quantity: number;
}

export interface CreateAssetStockMovementDto {
  type: 'IN' | 'OUT';
  quantity: number;
  freeQuantity?: number;
  reason: string;
  notes?: string;
  sources?: StockMovementSourceDto[];
}

export interface AssetStockMovementSourceDto {
  assignmentId: number;
  personId: number;
  personName: string;
  assignmentType: string;
  quantity: number;
}

export interface AssetStockMovementDto {
  id: number;
  assetId: number;
  type: 'IN' | 'OUT';
  quantity: number;
  freeQuantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  notes?: string | null;
  sourceBreakdown?: AssetStockMovementSourceDto[] | null;
  createdAt: string;
  performedByUser?: { id: number; name: string; email: string } | null;
}
