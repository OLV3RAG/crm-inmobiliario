-- Ciudad / localidad en propiedades (además de municipio INEGI)
USE nexova_db;

ALTER TABLE properties
  ADD COLUMN city VARCHAR(150) NULL AFTER municipality,
  ADD INDEX idx_property_city (city);
