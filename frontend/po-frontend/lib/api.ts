import axios from 'axios';
import { getToken, clearAuth } from './auth';
import {
  ApprovalDecision,
  AuthResponse,
  Budget,
  BudgetRequest,
  CreatePOPayload,
  MonthlySpending,
  Notification,
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

const REFRESH_KEY = 'refresh_token';

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem(REFRESH_KEY);
      if (refresh) {
        try {
          const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh`, { refresh_token: refresh });
          localStorage.setItem('access_token', data.access_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          // refresh failed — fall through to logout
        }
      }
      clearAuth();
      localStorage.removeItem(REFRESH_KEY);
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
  list: (status?: string, category?: string) =>
    api.get<PurchaseOrder[]>('/purchase-orders', { params: { status, category } }).then((r) => r.data),

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

  hardReject: (id: string, data: RejectPOPayload) =>
    api.post<PurchaseOrder>(`/purchase-orders/${id}/hard-reject`, data).then((r) => r.data),

  monthlySpendings: () =>
    api.post<MonthlySpending[]>('/purchase-orders/monthly-spending').then((r) => r.data),

  myApprovals: () =>
    api.get<ApprovalDecision[]>('/purchase-orders/my-approvals').then((r) => r.data),

  allForReport: () =>
    api.get<PurchaseOrder[]>('/purchase-orders/all-for-report').then((r) => r.data),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: () =>
    api.get<User[]>('/users').then((r) => r.data),

  updateRole: (id: string, role: string) =>
    api.patch<User>(`/users/${id}/role`, { role }).then((r) => r.data),

  me: () =>
    api.get<User>('/users/me').then((r) => r.data),

  updateMe: (data: { name?: string; password?: string }) =>
    api.patch<User>('/users/me', data).then((r) => r.data),

  adminContact: () =>
    api.get<{ name: string; email: string } | null>('/users/admin-contact').then((r) => r.data),
};

// ─── Budgets ──────────────────────────────────────────────────────────────────

export const budgetsApi = {
  getAll: (year?: number) =>
    api.get<Budget[]>('/budgets', { params: year ? { year } : {} }).then((r) => r.data),

  getMe: () =>
    api.get<Budget | null>('/budgets/me').then((r) => r.data),

  set: (userId: string, annual_limit: number, year?: number) =>
    api.post<Budget>('/budgets', { userId, annual_limit, year }).then((r) => r.data),

};

// ─── Budget Requests ─────────────────────────────────────────────────────────

export const budgetRequestsApi = {
  create: (description: string, requestedLimit?: number) =>
    api.post<BudgetRequest>('/budget-requests', { description, requestedLimit }).then((r) => r.data),

  mine: () =>
    api.get<BudgetRequest[]>('/budget-requests/mine').then((r) => r.data),

  all: () =>
    api.get<BudgetRequest[]>('/budget-requests').then((r) => r.data),

  approve: (id: string, newLimit: number) =>
    api.patch<BudgetRequest>(`/budget-requests/${id}/approve`, { newLimit }).then((r) => r.data),

  reject: (id: string, comment: string) =>
    api.patch<BudgetRequest>(`/budget-requests/${id}/reject`, { comment }).then((r) => r.data),
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const notificationsApi = {
  recent: () =>
    api.get<Notification[]>('/purchase-orders/notifications').then((r) => r.data),
};
