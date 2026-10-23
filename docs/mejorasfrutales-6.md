# Plan — Formato numérico es-CO en los campos + decimales en merma y cantidad inicial

> **Estado:** implementado (2026-10-22).
> Decisión aprobada: sin máscara en vivo — los campos aceptan escribir con puntos de miles y coma decimal; el Resumen muestra los valores formateados en vivo.

## Contexto (inspección)
- La visualización ya está en es-CO (Intl). El problema es la entrada: los 5 campos usan `type="number"`, que no admite puntos de miles y maneja mal la coma.
- `parseNumber` (lib/calc.ts) solo cambiaba la primera coma por punto → "3.598.998.323,87" devolvía 0.
- Las precargas al editar usaban `String(número)` ("8.5"), inconsistente con el formato.

## Cambios (solo cliente; servidor y BD sin cambios)

1. **Parser robusto** (`parseNumber`): con coma → puntos = miles y coma = decimal; sin coma → punto con grupos de 3 = miles ("1.234"→1234), en otro caso decimal ("2.5"→2.5); vacío/inválido → 0.
2. **5 inputs** → `type="text"` + `inputMode="decimal"` + `autoComplete="off"` (se quitan min/step/max): cantidad inicial, merma, rendimiento neto (ProjectFormPage) y monto + TRM (MoneyField).
3. **Precargas es-CO** (11 puntos) con `formatInputNumber(value, maxDecimals)` (Intl sin símbolo): toFormValues (7), buildPaymentInitial (2), modal de gastos (2) y valor auto del rendimiento. Decimales: kg 3 · dinero 2 · TRM 4 · % 2.
4. **Decimales habilitados**: merma (Decimal(5,2)) y cantidad inicial (Decimal(12,3)) ya soportados por BD/servidor; quedan escribibles como "12,5".

## Verificación
- Unitarias de `parseNumber`: "3.598.998.323,87"→3598998323.87 · "2,5"→2.5 · "2.5"→2.5 · "1.234"→1234 · "1.234.567"→1234567 · ""→0 · "abc"→0 · "12,5"→12.5.
- SSR: inputs con `inputmode="decimal"` sin `type="number"`; precarga con coma ("8,5").
- `typecheck` + `build` del cliente.

## Fuera de alcance
- Máscara en vivo y parseo es-CO en el servidor (el cliente envía números).
