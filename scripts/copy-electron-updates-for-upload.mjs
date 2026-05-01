/**
 * Copia latest.yml + Setup.exe + .blockmap de release/ a base44-electron-upload/electron-updates/
 * para subirlos manualmente al hosting Base44 (o cualquier CDN estático).
 */
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const releaseDir = path.join(root, 'release');
const outDir = path.join(root, 'base44-electron-upload', 'electron-updates');

const setupName = `StreamNexus Setup ${version}.exe`;
const files = ['latest.yml', setupName, `${setupName}.blockmap`];

fs.mkdirSync(outDir, { recursive: true });
for (const name of files) {
  const src = path.join(releaseDir, name);
  const dest = path.join(outDir, name);
  if (!fs.existsSync(src)) {
    console.error('Falta:', src);
    console.error('Ejecutá antes: npm run electron:dist');
    process.exit(1);
  }
  fs.copyFileSync(src, dest);
  console.log('OK', dest);
}
console.log('\nSubí TODO el contenido de:', outDir);
console.log('a la URL base de actualizaciones (misma ruta que build.publish en package.json).');
