import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { round, PAYMENT_STATUSES, type PaymentStatus } from '../projects/projects.calc.js';
import { toProjectDto } from '../projects/projects.mapper.js';

/** Payment status breakdown entry (counts + outstanding balance). */
export interface PaymentBreakdownEntry {
  status: PaymentStatus;
  count: number;
  /** Outstanding balance of these sales (COP). */
  balance: number;
}

/** One point of the 6-month revenue/cost/profit series. */
export interface MonthlyPoint {
  /** "YYYY-MM" (UTC month). */
  month: string;
  revenue: number;
  cost: number;
  profit: number;
}

/** KPI payload returned by GET /api/dashboard/metrics. */
export interface DashboardMetrics {
  totalProjects: number;
  soldProjects: number;
  unsoldProjects: number;
  /** Sum of revenue across projects with a registered sale (COP). */
  totalRevenue: number;
  /** Revenue - purchase - expenses across sold projects (COP). */
  netProfit: number;
  /** netProfit / totalRevenue * 100; null when there is no revenue. */
  profitMargin: number | null;
  /** Expenses registered on sold projects (COP). */
  totalExpenses: number;
  /** Registered payments (a Contado sale without payments counts as paid). */
  totalPaid: number;
  /** Sum of positive balances across sold projects (COP). */
  outstandingAmount: number;
  /** Outstanding balance of overdue credits (COP). */
  overdueAmount: number;
  /** Credit sales with balance and due date not passed yet. */
  pendingCredits: number;
  /** Credit sales with balance and past due date. */
  overdueCredits: number;
  /** Any sale with an outstanding balance (Pendiente + Abonado + Vencido). */
  outstandingCredits: number;
  /** Last 6 months (including the current one), zero-filled. */
  monthly: MonthlyPoint[];
  paymentBreakdown: PaymentBreakdownEntry[];
  topProducts: Array<{ name: string; projectCount: number; revenue: number; profit: number }>;
  topDebtors: Array<{ name: string; projectCount: number; balance: number; overdue: boolean }>;
  /** Top 5 sold projects by profit, for the per-project chart. */
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

// Raw aggregate row shapes (counts cast to int, sums to float8).
interface TotalsRow {
  totalProjects: number;
  soldProjects: number;
  totalRevenue: number;
  netProfit: number;
  totalExpenses: number;
  totalPaid: number;
  outstandingAmount: number;
  overdueAmount: number;
  pendingCredits: number;
  overdueCredits: number;
  partialCredits: number;
}
interface BreakdownRow {
  status: PaymentStatus;
  count: number;
  balance: number;
}
interface MonthlyRow {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
}
interface TopProductRow {
  name: string;
  projectCount: number;
  revenue: number;
  profit: number;
}
interface TopDebtorRow {
  name: string;
  projectCount: number;
  balance: number;
  overdue: boolean;
}
interface TopProjectRow {
  id: string;
  name: string;
  totalCost: number;
  totalRevenue: number;
  netProfit: number;
}

/**
 * Shared CTE: one row per project with its COP-normalized money values and the
 * derived balance + payment status. Mirrors the mapper rules exactly:
 *  - a Contado sale with no registered payments counts as fully paid (legacy);
 *  - due date compared against the start of the current UTC day (due today
 *    still counts as pending/abonado, not overdue).
 */
const CALC_CTE = Prisma.raw(`
  WITH "proj" AS (
    SELECT
      p."id",
      p."name",
      p."buyerName",
      p."sellingPrice",
      p."paymentType",
      p."scheduledPaymentDate",
      ((p."initialQty" / 1000) * p."purchasePrice" * COALESCE(p."purchaseExchangeRate", 1)) AS "purchaseCost",
      CASE WHEN p."sellingPrice" IS NOT NULL
        THEN (p."netYield" / 1000) * p."sellingPrice" * COALESCE(p."exchangeRate", 1)
      END AS "revenue",
      CASE
        WHEN COUNT(pay."id") = 0 AND p."paymentType" = 'Contado' AND p."sellingPrice" IS NOT NULL
          THEN (p."netYield" / 1000) * p."sellingPrice" * COALESCE(p."exchangeRate", 1)
        ELSE COALESCE(SUM(pay."amount" * COALESCE(pay."exchangeRate", 1)), 0)
      END AS "paidAmount",
      COALESCE((
        SELECT SUM(e."amount" * COALESCE(e."exchangeRate", 1))
        FROM "expenses" e
        WHERE e."projectId" = p."id"
      ), 0) AS "expensesAmount"
    FROM "projects" p
    LEFT JOIN "payments" pay ON pay."projectId" = p."id"
    GROUP BY p."id"
  ),
  "calc" AS (
    SELECT
      *,
      CASE WHEN "sellingPrice" IS NULL THEN NULL
        ELSE GREATEST("revenue" - "paidAmount", 0)
      END AS "balance",
      CASE
        WHEN "sellingPrice" IS NULL THEN NULL
        WHEN "paidAmount" >= "revenue" THEN 'Pagado'
        WHEN "paymentType" = 'Crédito' AND "scheduledPaymentDate" IS NOT NULL
          AND "scheduledPaymentDate" < date_trunc('day', now() AT TIME ZONE 'UTC') THEN 'Vencido'
        WHEN "paidAmount" > 0 THEN 'Abonado'
        ELSE 'Pendiente'
      END AS "status"
    FROM "proj"
  )
`);

/** Last 6 UTC month keys (including the current one), oldest first. */
const lastSixMonthKeys = (): string[] => {
  const now = new Date();
  const keys: string[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    keys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
};

/**
 * Aggregate every KPI in parallel round-trips: one SQL query per concern
 * (derived money values are formulas over stored columns, so they are summed
 * in PostgreSQL, not in JS) plus two small Prisma reads for the recents.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [totalsRows, breakdownRows, monthlyRows, topProductRows, topDebtorRows, topProjectRows, recent] =
    await Promise.all([
      prisma.$queryRaw<TotalsRow[]>`
        ${CALC_CTE}
        SELECT
          COUNT(*)::int AS "totalProjects",
          COUNT(*) FILTER (WHERE "sellingPrice" IS NOT NULL)::int AS "soldProjects",
          COALESCE(SUM("revenue")::float8, 0) AS "totalRevenue",
          COALESCE(SUM(
            CASE WHEN "sellingPrice" IS NOT NULL
            THEN "revenue" - "purchaseCost" - "expensesAmount" END
          )::float8, 0) AS "netProfit",
          COALESCE(SUM(
            CASE WHEN "sellingPrice" IS NOT NULL THEN "expensesAmount" END
          )::float8, 0) AS "totalExpenses",
          COALESCE(SUM(
            CASE WHEN "sellingPrice" IS NOT NULL THEN "paidAmount" END
          )::float8, 0) AS "totalPaid",
          COALESCE(SUM("balance")::float8, 0) AS "outstandingAmount",
          COALESCE(SUM(
            CASE WHEN "status" = 'Vencido' THEN "balance" END
          )::float8, 0) AS "overdueAmount",
          COUNT(*) FILTER (WHERE "status" = 'Pendiente')::int AS "pendingCredits",
          COUNT(*) FILTER (WHERE "status" = 'Vencido')::int AS "overdueCredits",
          COUNT(*) FILTER (WHERE "status" = 'Abonado')::int AS "partialCredits"
        FROM "calc"
      `,
      prisma.$queryRaw<BreakdownRow[]>`
        ${CALC_CTE}
        SELECT
          "status",
          COUNT(*)::int AS "count",
          COALESCE(SUM("balance")::float8, 0) AS "balance"
        FROM "calc"
        WHERE "status" IS NOT NULL
        GROUP BY "status"
      `,
      prisma.$queryRaw<MonthlyRow[]>`
        WITH "sold" AS (
          SELECT
            date_trunc('month', COALESCE(p."transactionDate", p."createdAt")) AS "monthStart",
            ((p."netYield" / 1000) * p."sellingPrice" * COALESCE(p."exchangeRate", 1)) AS "revenue",
            ((p."initialQty" / 1000) * p."purchasePrice" * COALESCE(p."purchaseExchangeRate", 1)) AS "purchaseCost",
            COALESCE((
              SELECT SUM(e."amount" * COALESCE(e."exchangeRate", 1))
              FROM "expenses" e
              WHERE e."projectId" = p."id"
            ), 0) AS "expensesAmount"
          FROM "projects" p
          WHERE p."sellingPrice" IS NOT NULL
            AND COALESCE(p."transactionDate", p."createdAt")
                >= (date_trunc('month', now() AT TIME ZONE 'UTC') - interval '5 months')
        )
        SELECT
          to_char("monthStart", 'YYYY-MM') AS "month",
          COALESCE(SUM("revenue")::float8, 0) AS "revenue",
          COALESCE(SUM("purchaseCost" + "expensesAmount")::float8, 0) AS "cost",
          COALESCE(SUM("revenue" - "purchaseCost" - "expensesAmount")::float8, 0) AS "profit"
        FROM "sold"
        GROUP BY "monthStart"
        ORDER BY "monthStart"
      `,
      prisma.$queryRaw<TopProductRow[]>`
        WITH "sold" AS (
          SELECT
            btrim(p."productName") AS "name",
            ((p."netYield" / 1000) * p."sellingPrice" * COALESCE(p."exchangeRate", 1)) AS "revenue",
            ((p."initialQty" / 1000) * p."purchasePrice" * COALESCE(p."purchaseExchangeRate", 1)
              + COALESCE((
                  SELECT SUM(e."amount" * COALESCE(e."exchangeRate", 1))
                  FROM "expenses" e
                  WHERE e."projectId" = p."id"
                ), 0)) AS "cost"
          FROM "projects" p
          WHERE p."sellingPrice" IS NOT NULL AND btrim(p."productName") <> ''
        )
        SELECT
          "name",
          COUNT(*)::int AS "projectCount",
          COALESCE(SUM("revenue")::float8, 0) AS "revenue",
          COALESCE(SUM("revenue" - "cost")::float8, 0) AS "profit"
        FROM "sold"
        GROUP BY "name"
        ORDER BY "profit" DESC
        LIMIT 5
      `,
      prisma.$queryRaw<TopDebtorRow[]>`
        ${CALC_CTE}
        SELECT
          COALESCE(NULLIF(btrim("buyerName"), ''), "name") AS "name",
          COUNT(*)::int AS "projectCount",
          COALESCE(SUM("balance")::float8, 0) AS "balance",
          BOOL_OR("status" = 'Vencido') AS "overdue"
        FROM "calc"
        WHERE "balance" > 0
        GROUP BY COALESCE(NULLIF(btrim("buyerName"), ''), "name")
        ORDER BY "balance" DESC
        LIMIT 5
      `,
      prisma.$queryRaw<TopProjectRow[]>`
        ${CALC_CTE}
        SELECT
          "id",
          "name",
          ("purchaseCost" + "expensesAmount")::float8 AS "totalCost",
          "revenue"::float8 AS "totalRevenue",
          ("revenue" - "purchaseCost" - "expensesAmount")::float8 AS "netProfit"
        FROM "calc"
        WHERE "sellingPrice" IS NOT NULL
        ORDER BY "netProfit" DESC
        LIMIT 5
      `,
      prisma.project.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: { expenses: true, payments: true },
      }),
    ]);

  const totals: TotalsRow = totalsRows[0] ?? {
    totalProjects: 0,
    soldProjects: 0,
    totalRevenue: 0,
    netProfit: 0,
    totalExpenses: 0,
    totalPaid: 0,
    outstandingAmount: 0,
    overdueAmount: 0,
    pendingCredits: 0,
    overdueCredits: 0,
    partialCredits: 0,
  };

  const totalRevenue = round(totals.totalRevenue, 2);
  const netProfit = round(totals.netProfit, 2);

  // Zero-fill the 6-month series so the chart always renders 6 columns.
  const monthlyByKey = new Map(monthlyRows.map((row) => [row.month, row]));
  const monthly: MonthlyPoint[] = lastSixMonthKeys().map((month) => {
    const row = monthlyByKey.get(month);
    return {
      month,
      revenue: round(row?.revenue ?? 0, 2),
      cost: round(row?.cost ?? 0, 2),
      profit: round(row?.profit ?? 0, 2),
    };
  });

  // Fixed status order with zeros for statuses without sales.
  const breakdownByStatus = new Map(breakdownRows.map((row) => [row.status, row]));
  const paymentBreakdown: PaymentBreakdownEntry[] = PAYMENT_STATUSES.map((status) => ({
    status,
    count: breakdownByStatus.get(status)?.count ?? 0,
    balance: round(breakdownByStatus.get(status)?.balance ?? 0, 2),
  }));

  return {
    totalProjects: totals.totalProjects,
    soldProjects: totals.soldProjects,
    unsoldProjects: totals.totalProjects - totals.soldProjects,
    totalRevenue,
    netProfit,
    profitMargin: totalRevenue > 0 ? round((netProfit / totalRevenue) * 100, 1) : null,
    totalExpenses: round(totals.totalExpenses, 2),
    totalPaid: round(totals.totalPaid, 2),
    outstandingAmount: round(totals.outstandingAmount, 2),
    overdueAmount: round(totals.overdueAmount, 2),
    pendingCredits: totals.pendingCredits,
    overdueCredits: totals.overdueCredits,
    outstandingCredits: totals.pendingCredits + totals.overdueCredits + totals.partialCredits,
    monthly,
    paymentBreakdown,
    topProducts: topProductRows.map((row) => ({
      name: row.name,
      projectCount: row.projectCount,
      revenue: round(row.revenue, 2),
      profit: round(row.profit, 2),
    })),
    topDebtors: topDebtorRows.map((row) => ({
      name: row.name,
      projectCount: row.projectCount,
      balance: round(row.balance, 2),
      overdue: row.overdue,
    })),
    topProjects: topProjectRows.map((row) => ({
      id: row.id,
      name: row.name,
      totalCost: round(row.totalCost, 2),
      totalRevenue: round(row.totalRevenue, 2),
      netProfit: round(row.netProfit, 2),
    })),
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
  };
}
