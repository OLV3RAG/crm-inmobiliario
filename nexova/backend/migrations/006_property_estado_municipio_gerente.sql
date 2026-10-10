-- Ubicación (estado/municipio) y gerente responsable en propiedades
USE nexova_db;

ALTER TABLE properties
  ADD COLUMN state VARCHAR(100) NULL AFTER zone,
  ADD COLUMN municipality VARCHAR(150) NULL AFTER state,
  ADD COLUMN admin_id CHAR(36) NULL AFTER asesor_id,
  ADD INDEX idx_property_state (state),
  ADD INDEX idx_property_municipality (municipality),
  ADD INDEX idx_property_admin (admin_id);

UPDATE properties SET state = zone WHERE state IS NULL AND zone IS NOT NULL AND zone <> '';

UPDATE properties p
INNER JOIN asesores a ON p.asesor_id = a.id
SET p.admin_id = a.admin_id
WHERE p.admin_id IS NULL AND a.admin_id IS NOT NULL;
