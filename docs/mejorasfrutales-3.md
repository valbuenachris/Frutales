# Plan — Ajustes de texto en el resumen

> **Estado:** implementado (2026-10-18).
> Alcance: solo textos (sin lógica, API ni migraciones).

## Cambios

1. **"Costo por kg de producto" → "Costo por kg"** en los dos resúmenes (rótulo igual en toda la app):
   - `client/src/pages/ProjectFormPage.tsx:288` — resumen del formulario.
   - `client/src/pages/ProjectDetailsPage.tsx:206` — resumen del detalle.
   - Nota: la nota de fórmula del detalle ya dice "Costo por kg" — sin cambio.

2. **"Ingreso en dólares" → "Venta en dólares"**:
   - `client/src/pages/ProjectFormPage.tsx:310` — fila del resumen cuando la venta es en US$ (única ocurrencia en el código).

## Verificación

- Grep final sin residuos de `Costo por kg de producto` ni `Ingreso en dólares`.
- `npm run typecheck` + `npm run build` del cliente.

## Notas

- El cambio queda **sin commitear** salvo indicación contraria.
- Pendientes de la sesión anterior: commit del fix del logout (`43e0d36`) sin push (faltan credenciales) y bump de TypeScript 7 sin commitear.
