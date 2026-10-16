import type { PaymentStatus } from './project';

/** Catalog item API shapes (catálogo maestro). */
export interface Product {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Process {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  contact: string | null;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/dashboard/metrics shape. */
export interface DashboardMetrics {
  totalProjects: number;
  totalRevenue: number;
  netProfit: number;
  pendingCredits: number;
  overdueCredits: number;
  outstandingCredits: number;
  recentProjects: Array<{
    id: string;
    name: string;
    productName: string;
    netProfit: number | null;
    paymentStatus: PaymentStatus | null;
    updatedAt: string;
  }>;
  chartData: Array<{
    id: string;
    name: string;
    totalCost: number;
    totalRevenue: number;
  }>;
}
