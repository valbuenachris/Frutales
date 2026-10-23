-- Migración de datos (sin cambio de esquema): todo el sistema pasa a gramos.
--  - Cantidades: kg -> g (×1000). Decimal(12,3) en gramos = precisión de mg.
--  - Precios de compra y venta: por kg -> por gramo (÷1000).
--    Decimal(12,2) por gramo = 0,01/g de resolución (≈ 10 por kg).
-- El dinero no cambia: 10 kg × 2.500/kg == 10.000 g × 2,50/g.

UPDATE "projects" SET "initialQty" = "initialQty" * 1000,
                      "netYield"   = "netYield"   * 1000;

UPDATE "projects" SET "purchasePrice" = "purchasePrice" / 1000;

UPDATE "projects" SET "sellingPrice" = "sellingPrice" / 1000
WHERE "sellingPrice" IS NOT NULL;
