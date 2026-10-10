import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function migrate() {
  const sql = fs.readFileSync(
    path.join(process.cwd(), 'migrations', '001_initial_schema.sql'),
    'utf8'
  );
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });
  await connection.query(sql);
  await connection.end();
  console.log('Migración 001 aplicada correctamente.');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
