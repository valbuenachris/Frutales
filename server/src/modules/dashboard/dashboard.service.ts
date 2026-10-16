import { prisma } from '../../lib/prisma.js';
import { round, type PaymentStatus } from '../projects/projects.calc.js';
import { toProjectDto } from '../projects/projects.mapper.js';

/** KPI payload returned by GET /api/dashboard/metrics. */
export interface DashboardMetrics {
  totalProjects: number;
  /** Sum of totalRevenue across projects with a registered sale. */
  totalRevenue: number;
  /** Sum of netProfit across projects with a registered sale. */
  netProfit: number;
  /** Credit sales whose due date has not passed yet. */
  pendingCredits: number;
  /** Credit sales whose due date has passed. */
  overdueCredits: number;
  /** pendingCredits + overdueCredits ("Créditos pendientes" KPI). */
  outstandingCredits: number;
  recentProjects: Array<{
    id: string;
    name: string;
    productName: string;
    netProfit: number | null;
    paymentStatus: PaymentStatus | null;
    updatedAt: string;
  }>;
  /** Last projects with a sale, for the revenue-vs-cost mini chart. */
  chartData: Array<{
    id: string;
    name: string;
    totalCost: number;
    totalRevenue: number;
  }>;
}

/** Raw aggregate row (counts cast to int, sums to float8). */
interface TotalsRow {
  totalProjects: number;
  totalRevenue: number;
  netProfit: number;
  pendingCredits: number;
  overdueCredits: number;
}

/**
 * Aggregate all KPIs in three parallel round-trips:
 *  1. one SQL aggregate over the whole table (derived money values are formulas
 *     over stored columns, so they are summed in PostgreSQL, not in JS),
 *  2. the 5 most recently touched projects,
 *  3. up to 6 recent sold projects for the mini chart.
 *
 * The credit due-date comparison mirrors computePaymentStatus(): a payment due
 * today still counts as pending until the UTC day is over.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [totalsRows, recent, chartSource] = await Promise.all([
    prisma.$queryRaw<TotalsRow[]>`
      SELECT
        COUNT(*)::int AS "totalProjects",
        COALESCE(SUM("netYield" * "sellingPrice")::float8, 0) AS "totalRevenue",
        COALESCE(SUM("netYield" * "sellingPrice" - "initialQty" * "purchasePrice")::float8, 0) AS "netProfit",
        COUNT(*) FILTER (
          WHERE "paymentType" = 'Crédito'
            AND "scheduledPaymentDate" >= date_trunc('day', now() AT TIME ZONE 'UTC')
        )::int AS "pendingCredits",
        COUNT(*) FILTER (
          WHERE "paymentType" = 'Crédito'
            AND "scheduledPaymentDate" < date_trunc('day', now() AT TIME ZONE 'UTC')
        )::int AS "overdueCredits"
      FROM "projects"
    `,
    prisma.project.findMany({ orderBy: { updatedAt: 'desc' }, take: 5 }),
    prisma.project.findMany({
      where: { sellingPrice: { not: null } },
      orderBy: { updatedAt: 'desc' },
      take: 6,
    }),
  ]);

  const totals: TotalsRow = totalsRows[0] ?? {
    totalProjects: 0,
    totalRevenue: 0,
    netProfit: 0,
    pendingCredits: 0,
    overdueCredits: 0,
  };

  return {
    totalProjects: totals.totalProjects,
    totalRevenue: round(totals.totalRevenue, 2),
    netProfit: round(totals.netProfit, 2),
    pendingCredits: totals.pendingCredits,
    overdueCredits: totals.overdueCredits,
    outstandingCredits: totals.pendingCredits + totals.overdueCredits,
    recentProjects: recent.map((project) => {
      const dto = toProjectDto(project);
      return {
        id: dto.id,
        name: dto.name,
        productName: dto.productName,
        netProfit: dto.netProfit,
        paymentStatus: dto.paymentStatus,
        updatedAt: dto.updatedAt,
      };
    }),
    chartData: chartSource.map((project) => {
      const dto = toProjectDto(project);
      return {
        id: dto.id,
        name: dto.name,
        totalCost: dto.totalCost,
        totalRevenue: dto.totalRevenue ?? 0,
      };
    }),
  };
}
