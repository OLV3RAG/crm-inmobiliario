#!/bin/bash
# Restaurar backup NEXOVA desde S3/B2
# Uso: ./restore.sh <archivo.sql.gz.gpg>

set -euo pipefail

FILE="${1:?Especifica el archivo de backup}"
DB_HOST="${DB_HOST:-localhost}"
DB_USER="${DB_USER:-root}"
DB_NAME="${DB_NAME:-nexova_db}"

echo "Desencriptando..."
gpg --batch --decrypt "$FILE" > /tmp/restore.sql.gz

echo "Descomprimiendo..."
gunzip -c /tmp/restore.sql.gz > /tmp/restore.sql

echo "Restaurando en $DB_NAME..."
mysql -h "$DB_HOST" -u "$DB_USER" -p "$DB_NAME" < /tmp/restore.sql

echo "Restauración completada."
