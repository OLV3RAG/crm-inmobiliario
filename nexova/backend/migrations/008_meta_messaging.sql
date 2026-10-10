-- Meta Messenger / Instagram — identificador externo del usuario en la plataforma
USE nexova_db;

ALTER TABLE leads
  ADD COLUMN external_id VARCHAR(120) NULL AFTER phone,
  ADD INDEX idx_leads_external (business_id, external_id);
