# Plan de mejoras — Frutales (abonos COP/USD, visor de fotos, textos del resumen)

> **Estado:** implementado (2026-10-17).
> Alcance aprobado: visor de fotos para pagos **+ gastos + comprobantes de compra/venta**, y unificación de textos también en los KPIs del dashboard.

## 1. Abonos en pesos y dólares

**Hallazgo de la auditoría: ya está soportado de punta a punta.**
- Servidor: `payments.schema.ts` acepta `currency` ("COP"/"USD") + `exchangeRate`; `payments.service.ts` resuelve la TRM (`resolveUsdCopRate`: valor enviado por el cliente o TRM en vivo datos.gov.co → open.er-api.com); el mapper normaliza cada abono a COP (`amountCop`, `paidAmount`, `balance`); el SQL del dashboard multiplica por `COALESCE("exchangeRate", 1)`.
- Cliente: el modal usa `MoneyField` con selector de moneda + TRM autocompletada + comprobante; la lista muestra `US$ X` con su equivalente `≈ $Y`.

Brechas de claridad a cerrar:
1. Chip de moneda explícito por abono en la lista ("COP"/"USD").
2. Encabezado "Total abonado (COP)" + nota "incluye abonos en dólares convertidos a la TRM del registro" cuando aplique.
3. Etiqueta dinámica del monto en el modal: "Monto del pago (US$)" / "Monto del pago (COP)".
4. Matriz de pruebas API (verificación).

## 2. Visor de fotos (pagos + gastos + comprobantes)

**Causa raíz:** la miniatura actual es un enlace `<a href="data:image/..." target="_blank">`; los navegadores móviles bloquean la navegación a URLs `data:`, por eso la foto no se abre.

**Solución:** `client/src/components/ImageViewer.tsx` — overlay a pantalla completa por portal:
- Imagen contenida (`object-contain`), cerrar con botón grande y tap en el fondo.
- Caption configurable y botón "Descargar" (data URL → blob → `comprobante-<tipo>-<fecha>.jpg`).
- Accesible: `role="dialog"`, `aria-modal`, bloqueo del scroll del fondo.

**Integración:** `PaymentsSection`, `ExpensesSection` y `ReceiptThumb` (detalle: compra/venta). Las miniaturas pasan de `<a>` a `<button>` que abre el visor.

## 3. Textos

- `SummaryCard.tsx` (resumen del detalle y del formulario): "Costo total" → **"Total inversión"**; "Ingreso total" → **"Venta total"**.
- Nota de fórmula en `ProjectDetailsPage.tsx`: "Costo total = …" → "Total inversión = …".
- Dashboard: "Ingresos totales" → **"Ventas totales"**; "Gastos" → **"Inversión en gastos"**.

## Archivos

- Cliente: `components/ImageViewer.tsx` (nuevo), `PaymentsSection.tsx`, `ExpensesSection.tsx`, `ProjectDetailsPage.tsx`, `SummaryCard.tsx`, `DashboardPage.tsx`.
- Servidor: sin cambios (los abonos COP/USD ya están soportados). Sin migraciones.

## Verificación

- Con autenticación: los smoke tests por API hacen login primero (`POST /api/auth/login`, cookie `frutales_session`) y la reutilizan.
- Matriz de abonos: COP en venta COP · USD en venta USD (TRM manual y automática) · USD en venta COP y viceversa · mixtos hasta `Pagado` · `Vencido` con abono · editar/eliminar recalcula.
- Cliente: `typecheck` + `build`; SSR del `ImageViewer` y del `SummaryCard` con los textos nuevos.

## Despliegue

Solo cliente: `git pull && docker compose up --build -d` (sin migraciones nuevas).

## Fuera de alcance

- Lógica de saldos/estados (ya correcta).
- Almacenamiento externo de imágenes (siguen como data URL en la BD).
- Consolidar el `mejorasfrutales.md` de la raíz con `docs/` (se propone aparte).
