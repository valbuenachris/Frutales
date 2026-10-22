# Plan — Eliminar el "tipo de proceso" de toda la aplicación

> **Estado:** implementado (2026-10-22).
> Decisiones del usuario: vaciar también el dato en la BD (irreversible, aprobado); conservar inertes el API `/api/processes`, la tabla `Process` y la FK `processId`.

## Cambios

**Base de datos** — migración `sin_tipo_proceso` (con `--create-only` + SQL manual):
- `schema.prisma`: `processType String?` (deja de ser obligatorio).
- SQL: `ALTER COLUMN "processType" DROP NOT NULL` + `UPDATE "projects" SET "processType" = NULL` (vacía el histórico).

**Servidor**
- `projects.schema.ts`: quitar `processType` del DTO Zod (si un cliente lo envía, se ignora).
- `projects.service.ts`: quitar `processType` del write (la columna queda NULL).
- `projects.mapper.ts`: quitar `processType` de la respuesta.

**Cliente**
- `ProjectFormPage.tsx`: eliminar el selector "Tipo de proceso", sus pistas, `processType` de valores/validación/payload y las consultas al catálogo de procesos.
- `ProjectDetailsPage.tsx`: quitar el chip del proceso. `ProjectCard.tsx`: dejar solo el nombre del producto.
- `sanitize-payload.ts` y `types/project.ts`: quitar `processType`.
- Limpieza de código muerto: `processHooks`, `catalogsApi.processes` y el tipo `Process`.

**Sin tocar:** `/api/processes`, modelo `Process`, FK `processId`, sección Productos y la lógica de cálculos. El spec E2E existente sigue funcionando (el campo que envía se ignora).

## Verificación
- Migración aplicada: `SELECT count(*) FROM projects WHERE "processType" IS NOT NULL` → 0.
- API: crear proyecto sin `processType` → 201; enviándolo → se ignora; el DTO ya no lo incluye.
- Grep: cero "Tipo de proceso"/`processType` en UI y payloads. `typecheck` + `build` de ambos lados.
- E2E rápido en Chrome: formulario solo con "Nombre del producto"; tarjeta y detalle sin proceso.

**Nota de despliegue:** el deploy aplicará la migración que borra el histórico de procesos por lote (irreversible); el servicio `migrate` lo hace automático.
