-- Ajuste: el dinero no maneja decimales (solo la caída/merma).
--  - Precios: vuelven a ser POR KG y enteros (el valor por gramo ×1000).
--    2,50/g -> 2.500/kg · 6,00/g -> 6.000/kg (recupera los valores originales).
--  - Cantidades (gramos) y TRM: redondeadas a entero.

UPDATE "projects" SET "purchasePrice" = "purchasePrice" * 1000;

UPDATE "projects" SET "sellingPrice" = "sellingPrice" * 1000
WHERE "sellingPrice" IS NOT NULL;

UPDATE "projects" SET "initialQty" = ROUND("initialQty"),
                      "netYield"   = ROUND("netYield");

UPDATE "projects" SET "exchangeRate" = ROUND("exchangeRate")
WHERE "exchangeRate" IS NOT NULL;

UPDATE "projects" SET "purchaseExchangeRate" = ROUND("purchaseExchangeRate")
WHERE "purchaseExchangeRate" IS NOT NULL;
