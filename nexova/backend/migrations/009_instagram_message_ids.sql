-- Instagram mid supera VARCHAR(100) y aborta el INSERT del mensaje
USE nexova_db;

ALTER TABLE messages
  MODIFY twilio_sid VARCHAR(512) NULL;

ALTER TABLE conversations
  MODIFY twilio_sid VARCHAR(512) NULL;
