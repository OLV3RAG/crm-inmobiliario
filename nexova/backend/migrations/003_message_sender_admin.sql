-- Permite distinguir mensajes enviados por admin/owner vs asesor
ALTER TABLE messages
  MODIFY sender_type ENUM('lead', 'bot', 'asesor', 'admin', 'system') NOT NULL;
