export enum UserRole {
  REQUESTER = 'REQUESTER',
  MANAGER = 'MANAGER',
  IT = 'IT',
  FINANCE = 'FINANCE',
  ADMIN = 'ADMIN',
}

export enum POStatus {
  PENDING_MANAGER = 'PENDING_MANAGER',
  PENDING_IT = 'PENDING_IT',
  PENDING_FINANCE = 'PENDING_FINANCE',
  NEEDS_REWORK = 'NEEDS_REWORK',
  INVOICED = 'INVOICED',
  PERMANENTLY_REJECTED = 'PERMANENTLY_REJECTED',
}

export enum POCategory {
  SERVICES = 'SERVICES',
  OFFICE_SUPPLIES = 'OFFICE_SUPPLIES',
  IT_EQUIPMENT = 'IT_EQUIPMENT',
}

export enum POAction {
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  HARD_REJECTED = 'HARD_REJECTED',
  REWORKED = 'REWORKED',
  INVOICED = 'INVOICED',
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  title: string;
  description?: string;
  amount: number;
  category: POCategory;
  status: POStatus;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface POHistory {
  id: string;
  action: POAction;
  fromStatus: POStatus;
  toStatus: POStatus;
  comment?: string;
  performedBy: User;
  timestamp: string;
  purchaseOrder?: PurchaseOrder;
}

export interface ApprovalDecision extends POHistory {
  purchaseOrder: PurchaseOrder;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
}

export interface CreatePOPayload {
  title: string;
  description?: string;
  amount: number;
  category: POCategory;
}

export interface UpdatePOPayload {
  title?: string;
  description?: string;
  amount?: number;
  category?: POCategory;
}

export interface RejectPOPayload {
  comment: string;
}

export interface MonthlySpending {
  requesterId: string;
  name: string;
  email: string;
  total: number;
}

export interface Budget {
  id: string;
  user: User;
  year: number;
  annual_limit: number;
  used_amount: number;
  updatedAt: string;
}

export interface Notification {
  id: string;
  action: POAction;
  toStatus: POStatus;
  comment?: string;
  timestamp: string;
  purchaseOrder: PurchaseOrder;
}
