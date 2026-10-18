# Plan de mejoras 2 — Abonos mixtos COP/USD y texto "Caída/Merma"

> **Estado:** implementado (2026-10-17).
> Decisiones del usuario: unificar **todos** los textos visibles a "merma/caída" y guardar este plan en `docs/mejorasfrutales-2.md`.

## 1. Abonos en dólares y pesos en el mismo proyecto

**Hallazgo:** ya es posible hoy (cada abono tiene su propia `currency` + TRM y la suma se normaliza a COP; la matriz anterior lo probó con un abono COP + uno USD en la misma venta). No requiere cambios de esquema ni backend; este plan mejora la **UX para que sea evidente y práctico**:

1. **Moneda predeterminada del nuevo abono = moneda de la venta**: `PaymentsSection` recibe `saleCurrency` (de `project.currency`); el modal "Nuevo abono o pago" abre en esa moneda (si la venta es USD, con TRM autocompletada). En edición conserva la moneda del abono.
2. **Desglose por moneda en el encabezado** (reemplaza la nota genérica de TRM), p. ej.:
   - `Total abonado (COP) $ 39.873`
   - `En pesos: $ 20.000 (2 abonos)` · `En dólares: US$ 5,00 ≈ $ 19.873 (1 abono)`
   - Solo se muestra cuando hay abonos en dólares (si todo es COP no se agrega nada).
3. **Pruebas**: matriz API autenticada con 3 abonos alternando monedas (suma exacta + estado) y venta USD con abonos en ambas; SSR del desglose; el cálculo del estado inicial del modal se extrae a una función pura (`buildPaymentInitial`) para testearla sin DOM.

**Archivos:** `PaymentsSection.tsx`, `ProjectDetailsPage.tsx` y `ProjectFormPage.tsx` (pasar la prop). Sin servidor, sin migraciones.

## 2. "Reducción de peso (%)" → "Caída/Merma (%)" (unificar textos visibles)

- `ProjectFormPage.tsx:510` — etiqueta → **"Caída/Merma (%)"**.
- `ProjectDetailsPage.tsx:98` — fila "Reducción" → **"Caída/Merma"**.
- `ProjectFormPage.tsx:553` — hint → "Calculado automáticamente: cantidad inicial × (1 − **merma**%)."
- `ProjectFormPage.tsx:132` — validación → "La **merma** debe estar entre 0 y 100."
- Servidor `projects.schema.ts:74-76` — Zod → "El porcentaje de **merma**…" (×3 mensajes).
- **No cambian** identificadores internos (`reductionPct`, `computeNetYield`) ni la lógica. Sin migraciones.

## Verificación

- API autenticada (login): matriz mixta (3 abonos alternando COP/USD, suma exacta, estado) + 400 con mensaje "merma".
- Cliente: typecheck + build + SSR (desglose por moneda, `buildPaymentInitial`).
- Regresión de la suite de pagos y grep final sin "reducción" en textos visibles.

## Despliegue

`git pull && docker compose up --build -d` (cliente + mensajes del servidor; sin migraciones).

## Fuera de alcance

- Cambiar la lógica de saldos/estados (ya correcta).
- Editar la moneda de la venta desde la sección de abonos.
