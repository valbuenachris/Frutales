# Plan — Precios de compra/venta por kg (1.000 g) + claridad y despliegue

> **Estado:** implementado (2026-10-23).
> Pedido: "el precio de compra y de venta se recibe en kg — si dice 4.500.000 se entiende que es lo pagado por 1.000 gramos; igual la venta (15.999.888 = precio de 1.000 gramos)".

## Hallazgo: el modelo pedido ya estaba en los cambios pendientes
- Compra: `costo = (gramos ÷ 1000) × precio de compra` → 10.000 g × 4.500.000/kg = 45.000.000 (`projects.calc.ts:32`, `lib/calc.ts:66`).
- Venta: `ingreso = (rendimiento neto ÷ 1000) × precio de venta` → 8.750 g × 15.999.888/kg = 139.999.020 (`projects.calc.ts:44`, `lib/calc.ts:70`).
- Rótulos "(por kg)" en el formulario y "$ … / kg" en el detalle; montos enteros hasta 9.999.999.999,99.

## 1. Formulario (`ProjectFormPage.tsx`)
- Hint nuevo en compra: "Precio por kilogramo (1.000 g) de la fruta comprada."
- Hint de venta: "Precio por kilogramo (1.000 g) del producto procesado (rendimiento neto)."
- Placeholders COP a ejemplos reales: 4.500.000 (compra) y 15.999.888 (venta); USD se mantiene 0,6 / 1,5.

## 2. Detalle (`ProjectDetailsPage.tsx`)
- Nota de fórmula corregida (estaba sin el ÷1000):
  - `Total inversión = (cantidad inicial ÷ 1000) × precio de compra`
  - `Ingreso = (rendimiento neto ÷ 1000) × precio de venta` (y variante USD con TRM).
- Comentario interno de `purchaseCost` alineado.

## 3. Comentarios/docs obsoletos
- `client/src/types/project.ts` (purchaseCost) y `AGENTS.md` (la línea de gastos decía "Costo por kg de producto = totalCost / netYield"; ahora es "Costo por gramo = (purchaseCost + expensesTotal) / netYield").

## Ajuste posterior (misma sesión)
- Bug corregido en el resumen USD del formulario (`ProjectFormPage.tsx`): "Compra en dólares" y "Venta en dólares" multiplicaban gramos × precio/kg **sin ÷1000**, mostrando montos ×1000 (p. ej. 36.159 g parecían 36.159 kg). Ahora `(gramos ÷ 1000) × precio`.
- El campo ya se llama "Cantidad inicial (g)" y guarda gramos: escribir 36159 almacena 36.159 g (lo "(kg)" que se ve en producción es la versión anterior, pendiente de desplegar).

## Verificación
- API: 10.000 g, compra 4.500.000/kg, merma 12,5%, venta 15.999.888/kg → costo 45.000.000 e ingreso 139.999.020 exactos; decimales rechazados.
- SSR: hints nuevos, nota de fórmula corregida, "/ kg" intactos.
- `typecheck` + `build` de cliente y servidor.

## Despliegue
`git pull --ff-only && docker compose up --build -d` — el servicio `migrate` aplica `unidades_gramos` + `precios_por_kg` (cantidades → gramos, precios → por kg originales, TRM entera).

## Fuera de alcance
- Cambiar la unidad de captura (todo sigue en gramos + precio por kg).
