import { expect, test } from '@playwright/test';

/**
 * Mobile E2E: project details -> Gastos modal (portaled to <body>) -> add an
 * expense -> the summary reflects the new totalCost (compra + gastos).
 *
 * Login and fixture project are created through the API so steps 1-4 stay
 * 100% UI; the project (and its expense, via cascade) is always deleted.
 * Requires E2E_EMAIL / E2E_PASSWORD (the config falls back to ADMIN_* from
 * server/.env) and Postgres running. The mobile device emulation lives in
 * playwright.config.ts (`mobile-chrome` project -> Pixel 7).
 */

const EMAIL = process.env.E2E_EMAIL ?? 'admin@frutales.local';
const PASSWORD = process.env.E2E_PASSWORD ?? '';

/** Same es-CO formatting as client/src/lib/format.ts (COP -> "$ 25.000"). */
const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const money = (value: number): string => copFormatter.format(value);

test.describe('Detalle de proyecto (móvil)', () => {
  test('abre el modal de gastos, agrega uno y actualiza el totalCost', async ({ page }) => {
    test.skip(!PASSWORD, 'Define E2E_PASSWORD (o ADMIN_PASSWORD en server/.env) para ejecutar el E2E.');

    // Sesión y proyecto de prueba (setup por API; los pasos 1-4 son UI).
    const login = await page.request.post('/api/auth/login', {
      data: { email: EMAIL, password: PASSWORD },
    });
    expect(login.ok(), 'el login del admin debe responder 200').toBe(true);

    const name = `Lote E2E ${Date.now()}`;
    const created = await page.request.post('/api/projects', {
      data: {
        name,
        productName: 'Piña E2E',
        processType: 'E2E',
        initialQty: 5,
        purchasePrice: 4000,
        reductionPct: 30,
      },
    });
    expect(created.status(), 'el proyecto de prueba debe crearse').toBe(201);
    const project = (await created.json()).data as {
      id: string;
      purchaseCost: number;
      netYield: number;
    };

    try {
      // 1) Pantalla de detalles del proyecto.
      await page.goto(`/projects/${project.id}`);
      await expect(page.getByRole('heading', { name })).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Fase 1 · Compra y procesamiento' }),
      ).toBeVisible();

      const gastos = page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: 'Gastos', exact: true }) });
      const costPerKgRow = page.locator('dt:text-is("Costo por kg de producto") + dd');
      const summaryValue = (label: string) => page.locator(`dt:text-is("${label}") + dd`);

      const expenseAmount = 5_000;
      const totalCost = project.purchaseCost + expenseAmount; // totalCost = compra + gastos
      const costPerKg = (cost: number) => `${money(cost / project.netYield)} / kg`;

      // Estado inicial: sin gastos y costo total = solo la compra.
      await expect(gastos).toContainText('Sin gastos registrados');
      await expect(costPerKgRow).toHaveText(costPerKg(project.purchaseCost));

      // 2) Abrir el modal de "Gastos" y comprobar que hizo portal a <body>.
      await gastos.getByRole('button', { name: 'Agregar gasto' }).click();
      const modal = page.locator('body > div.fixed').filter({
        has: page.getByRole('heading', { name: 'Nuevo gasto' }),
      });
      await expect(modal).toBeVisible();
      const portal = await modal.evaluate((node) => ({
        parentIsBody: node.parentElement === document.body,
        insideSection: node.closest('section') !== null,
      }));
      expect(portal.parentIsBody, 'el modal debe ser hijo directo de <body>').toBe(true);
      expect(portal.insideSection, 'el modal no debe anidarse en la sección Gastos').toBe(false);

      // 3) Agregar un gasto (COP, fecha de hoy por defecto).
      await modal.getByLabel('Concepto').fill('Empaque');
      await modal.getByLabel('Monto').fill(String(expenseAmount));
      const [createdExpense] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().includes(`/api/projects/${project.id}/expenses`) &&
            response.request().method() === 'POST',
        ),
        modal.getByRole('button', { name: 'Guardar' }).click(),
      ]);
      expect(createdExpense.status()).toBe(201);
      await expect(modal).toBeHidden();
      await expect(gastos.getByRole('listitem').filter({ hasText: 'Empaque' })).toBeVisible();

      // 4) El resumen refleja el nuevo totalCost (compra + gastos).
      await expect(summaryValue('Gastos')).toHaveText(money(expenseAmount));
      await expect(costPerKgRow).toHaveText(costPerKg(totalCost));
      // "Total inversión" es solo la compra: no cambia al agregar gastos.
      await expect(summaryValue('Total inversión')).toHaveText(money(project.purchaseCost));
    } finally {
      // Limpieza: elimina el proyecto de prueba (cascada a sus gastos).
      await page.request.delete(`/api/projects/${project.id}`);
    }
  });
});
