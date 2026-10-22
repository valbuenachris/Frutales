import type { PaymentStatus } from './project';

/** Catalog item API shapes (catálogo maestro). */
export interface Product {
  id: string;
  name: string;
  description: string | null;
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

/** Un punto de la serie mensual de ingresos/costo/ganancia. */
export interface MonthlyPoint {
  /** "YYYY-MM" (mes UTC). */
  month: string;
  revenue: number;
  cost: number;
  profit: number;
}

/** Conteo y saldo por estado de pago. */
export interface PaymentBreakdownEntry {
  status: PaymentStatus;
  count: number;
  balance: number;
}

/** GET /api/dashboard/metrics shape. */
export interface DashboardMetrics {
  totalProjects: number;
  soldProjects: number;
  unsoldProjects: number;
  totalRevenue: number;
  netProfit: number;
  /** netProfit / totalRevenue × 100; null si no hay ventas. */
  profitMargin: number | null;
  /** Gastos de lotes vendidos. */
  totalExpenses: number;
  totalPaid: number;
  outstandingAmount: number;
  overdueAmount: number;
  pendingCredits: number;
  overdueCredits: number;
  outstandingCredits: number;
  monthly: MonthlyPoint[];
  paymentBreakdown: PaymentBreakdownEntry[];
  topProducts: Array<{ name: string; projectCount: number; revenue: number; profit: number }>;
  topDebtors: Array<{ name: string; projectCount: number; balance: number; overdue: boolean }>;
  topProjects: Array<{
    id: string;
    name: string;
    totalCost: number;
    totalRevenue: number;
    netProfit: number;
  }>;
  recentProjects: Array<{
    id: string;
    name: string;
    productName: string;
    netProfit: number | null;
    paymentStatus: PaymentStatus | null;
    updatedAt: string;
  }>;
}
