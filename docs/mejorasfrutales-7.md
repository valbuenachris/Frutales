# Plan — Unidades en gramos (cantidad, rendimiento y precios por gramo)

> **Estado:** implementado (2026-10-23).
> Decisiones aprobadas: cantidad inicial y rendimiento en gramos; precios de compra y venta por gramo; datos existentes convertidos (cantidades ×1000, precios ÷1000); las filas del resumen pasan a "por gramo".

## 1. Base de datos — migración `unidades_gramos` (solo datos, sin cambio de esquema)
```sql
UPDATE "projects" SET "initialQty" = "initialQty" * 1000, "netYield" = "netYield" * 1000;
UPDATE "projects" SET "purchasePrice" = "purchasePrice" / 1000;
UPDATE "projects" SET "sellingPrice" = "sellingPrice" / 1000 WHERE "sellingPrice" IS NOT NULL;
```
- Carpeta de migración creada a mano (data-only) y aplicada con `prisma migrate deploy` (local y producción vía el servicio `migrate`).
- Dinero idéntico: 10 kg→10.000 g y 2.500/kg→2,50/g ⇒ costo 25.000 (igual); ingreso 48.000 (igual). KPIs sin cambios.
- Precisión: `Decimal(12,3)` gramos (mg) y `Decimal(12,2)` por gramo (0,01/g ≈ 10 por kg).
- Comentarios de `schema.prisma` actualizados (kg→g).

## 2. Cliente (textos y formato; sin lógica nueva)
- `formatQty`: " kg" → " g".
- Formulario: "Cantidad inicial (g)", "Rendimiento neto (g)", "Precio de compra (por gramo)" (+US$), "Precio de venta (por gramo de rendimiento neto)"; placeholders 10000 / 2.5 / 6.
- Resumen (form y detalle): "Costo por gramo" y "Ganancia neta por gramo" con sufijo `/ g` (sin conversiones).
- Detalle: precios con `/ g`; nota de fórmula con "por gramo".
- E2E `gastos-detalle.spec.ts`: rótulo "Costo por gramo", sufijo `/ g`, quitar `processType`.

## 3. Servidor — sin cambios de lógica
- `projects.calc.ts` y el SQL del dashboard quedan igual (ambos lados en gramos). Solo comentarios.

## Verificación
- Migración: cantidades ×1000 y precios ÷1000; dinero idéntico.
- API: proyecto 10.000 g × 2,50/g → costo 25.000; venta 8.000 g × 6/g → 48.000.
- SSR: "Costo por gramo" y "10.000 g". Grep sin "(kg)". `typecheck` + `build` de ambos.

## Despliegue
`git pull --ff-only && docker compose up --build -d` (el servicio `migrate` aplica la conversión).

## Fuera de alcance
- Unidad por proyecto y cambios de tipo de columna.
