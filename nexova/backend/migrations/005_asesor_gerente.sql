-- Asignar cada asesor a un gerente (admin)
USE nexova_db;

ALTER TABLE asesores
  ADD COLUMN admin_id CHAR(36) NULL AFTER business_id,
  ADD INDEX idx_asesor_admin (admin_id);
