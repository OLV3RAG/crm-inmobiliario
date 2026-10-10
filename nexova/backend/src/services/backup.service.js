import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createGzip } from 'zlib';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

async function gzipFile(inputPath, outputPath) {
  await pipeline(
    createReadStream(inputPath),
    createGzip(),
    createWriteStream(outputPath),
  );
  await fs.unlink(inputPath);
}

export async function runDatabaseBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const tmpDir = path.join(process.cwd(), 'tmp', 'backups');
  await fs.mkdir(tmpDir, { recursive: true });
  const sqlFile = path.join(tmpDir, `nexova_${timestamp}.sql`);
  const gzFile = `${sqlFile}.gz`;

  const cmd = `mysqldump -h ${env.db.host} -P ${env.db.port} -u ${env.db.user} -p"${env.db.password}" ${env.db.name} > "${sqlFile}"`;
  try {
    await execAsync(cmd);
    await gzipFile(sqlFile, gzFile);
    if (env.backup.gpgPassphrase) {
      await execAsync(`gpg --batch --yes --passphrase "${env.backup.gpgPassphrase}" -c "${gzFile}"`);
    }
    logger.info('Backup completado', { file: gzFile });
    return { success: true, file: gzFile };
  } catch (err) {
    logger.error('Backup falló', { err: err.message });
    return { success: false, error: err.message };
  }
}