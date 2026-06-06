import axios from 'axios';
import { getToken, clearAuth } from './auth';
import {
  AuthResponse,
  CreatePOPayload,
  POHistory,
  PurchaseOrder,
  RejectPOPayload,
  UpdatePOPayload,
  User,
} from '@/types';

const api = axios.create({
  baseURL: 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ message: string }>('/auth/register', data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
};

// ─── Purchase Orders ──────────────────────────────────────────────────────────

export const poApi = {
  list: () =>
    api.get<PurchaseOrder[]>('/purchase-orders').then((r) => r.data),

  get: (id: string) =>
    api.get<PurchaseOrder>(`/purchase-orders/${id}`).then((r) => r.data),

  create: (data: CreatePOPayload) =>
    api.post<PurchaseOrder>('/purchase-orders', data).then((r) => r.data),

  update: (id: string, data: UpdatePOPayload) =>
    api.patch<PurchaseOrder>(`/purchase-orders/${id}`, data).then((r) => r.data),

  approve: (id: string) =>
    api.post<PurchaseOrder>(`/purchase-orders/${id}/approve`).then((r) => r.data),

  reject: (id: string, data: RejectPOPayload) =>
    api.post<PurchaseOrder>(`/purchase-orders/${id}/reject`, data).then((r) => r.data),

  invoice: (id: string) =>
    api.post<PurchaseOrder>(`/purchase-orders/${id}/invoice`).then((r) => r.data),

  history: (id: string) =>
    api.get<POHistory[]>(`/purchase-orders/${id}/history`).then((r) => r.data),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: () =>
    api.get<User[]>('/users').then((r) => r.data),

  updateRole: (id: string, role: string) =>
    api.patch<User>(`/users/${id}/role`, { role }).then((r) => r.data),
};
