import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const infoFile = path.join(root, 'src', 'build-info.json');
const publicFile = path.join(root, 'public', 'version.json');

let info = { build: 0, builtAt: null };
if (fs.existsSync(infoFile)) {
  try {
    info = JSON.parse(fs.readFileSync(infoFile, 'utf8'));
  } catch {
    info = { build: 0, builtAt: null };
  }
}

info.build = Number(info.build || 0) + 1;
info.builtAt = new Date().toISOString();
info.version = `1.${info.build}`;

fs.writeFileSync(infoFile, `${JSON.stringify(info, null, 2)}\n`);
fs.mkdirSync(path.dirname(publicFile), { recursive: true });
fs.writeFileSync(publicFile, `${JSON.stringify(info, null, 2)}\n`);

console.log(`NEXOVA frontend ${info.version} (${info.builtAt})`);
