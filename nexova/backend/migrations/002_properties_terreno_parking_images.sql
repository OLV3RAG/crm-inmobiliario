-- NEXOVA — Terreno, estacionamientos e imágenes en propiedades
-- Ejecutar SOLO si tu tabla properties no tiene estos campos.
-- Si algún ALTER falla con "Duplicate column", ignóralo (ya existen).

USE nexova_db;

-- Descomenta y ejecuta línea por línea según lo que falte en tu BD:

-- ALTER TABLE properties ADD COLUMN m2_terreno DECIMAL(10,2) NULL AFTER m2_construccion;
-- ALTER TABLE properties ADD COLUMN parking INT NULL AFTER m2_terreno;
-- ALTER TABLE properties ADD COLUMN images JSON NULL AFTER features;
