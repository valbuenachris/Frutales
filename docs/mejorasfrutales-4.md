# Plan — Inspección de abonos mixtos + eliminar la sección Procesos

> **Estado:** implementado (2026-10-19).
> Decisión del usuario: al eliminar Procesos, el campo "Tipo de proceso" del formulario se mantiene como desplegable con los procesos existentes.

## 1. Inspección: abonos en pesos y dólares en un mismo proyecto

**Resultado de la inspección: NO hay bloqueo en el código actual — los abonos mixtos están permitidos de punta a punta.**
- Cliente: modal "Nuevo abono o pago" con selector **Moneda** por abono (COP/USD, TRM autocompletada); payload envía `currency`+`exchangeRate` por pago; abonos nuevos heredan la moneda de la venta; desglose "En pesos / En dólares".
- Servidor: `payments.schema.ts` acepta moneda/TRM por pago; el mapper normaliza a COP y suma `paidAmount`/`balance`.
- Pruebas API autenticadas previas: "3 abonos mixtos → $38.000 (Abonado)" y "venta USD pagada con abono COP → Pagado" — PASARON.

**Causas probables (en orden):**
1. Producción desactualizada (varios despliegues quedaron pendientes). Chequeo: en producción el modal de abono debe mostrar "Moneda" y el resumen debe decir "Costo por kg"/"Venta total en pesos".
2. TRM no autocompletada (p. ej. servidor sin internet): campo vacío con pista manual; guardar sin TRM muestra "El precio del dólar es obligatorio…" (se percibe como bloqueo). Igual mientras la TRM carga (timeouts largos).

**Verificación en ejecución (chrome-devtools, stack local):** login → proyecto con venta → abono USD (TRM autocompletada) → abono COP → Abonado + saldos + desglose. Si local funciona (esperado): desplegar. Datos de prueba se limpian.

**Mejoras UX aplicadas:** al guardar sin TRM se enfoca el campo TRM junto al mensaje; timeout de proveedores de TRM 8s → 4s.

## 2. Eliminar la sección Procesos (solo UI; API y datos intactos)

- `Layout.tsx`: quitar ítem "Procesos" del menú.
- `App.tsx`: quitar ruta `/processes` + import; eliminar `pages/ProcessesPage.tsx`.
- `ProjectFormPage.tsx`: se mantiene el desplegable "Tipo de proceso" leyendo el catálogo; pistas actualizadas (ya no mencionan la sección eliminada).
- **No se toca**: `/api/processes`, modelo `Process` ni datos (sin migración, sin pérdida, reversible).

**Verificación:** menú sin "Procesos"; `/processes` → "No encontrado"; desplegable del formulario funcionando; `typecheck` + `build` de cliente y servidor.
