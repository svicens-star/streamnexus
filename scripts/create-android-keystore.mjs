/**
 * Crea android/upload-keystore.jks y android/keystore.properties para firmar release.
 *
 * Uso:
 *   set STREAMNEXUS_KEYSTORE_PASS=MiClaveSegura
 *   set STREAMNEXUS_KEY_PASS=MiClaveSegura   (opcional; por defecto igual que STORE)
 *   npm run mobile:android:keystore
 *
 * Sin variables: usa contraseña de desarrollo (solo pruebas; cambiá antes de Play Store).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = join(root, 'android');
const keystorePath = join(androidDir, 'upload-keystore.jks');
const propsPath = join(androidDir, 'keystore.properties');

if (existsSync(keystorePath)) {
  console.error('Ya existe:', keystorePath);
  console.error('Eliminá el archivo solo si querés regenerar (perderás la misma firma en actualizaciones).');
  process.exit(1);
}

const storePass =
  process.env.STREAMNEXUS_KEYSTORE_PASS || 'StreamNexusDev2026!';
const keyPass = process.env.STREAMNEXUS_KEY_PASS || storePass;
const alias = process.env.STREAMNEXUS_KEY_ALIAS || 'upload';

if (!process.env.STREAMNEXUS_KEYSTORE_PASS) {
  console.warn(
    '\n[!] STREAMNEXUS_KEYSTORE_PASS no definida. Usando contraseña de desarrollo.',
    'Para producción / Play Store definí la variable y volvé a generar en una máquina limpia.\n'
  );
}

const keytool = process.platform === 'win32' ? 'keytool.exe' : 'keytool';

execFileSync(
  keytool,
  [
    '-genkeypair',
    '-v',
    '-storetype',
    'JKS',
    '-keyalg',
    'RSA',
    '-keysize',
    '2048',
    '-validity',
    '10000',
    '-storepass',
    storePass,
    '-keypass',
    keyPass,
    '-alias',
    alias,
    '-keystore',
    keystorePath,
    '-dname',
    'CN=StreamNexus, OU=Mobile, O=StreamNexus, L=Buenos Aires, ST=BA, C=AR',
  ],
  { stdio: 'inherit' }
);

const props = `storePassword=${storePass}
keyPassword=${keyPass}
keyAlias=${alias}
storeFile=../upload-keystore.jks
`;

writeFileSync(propsPath, props, 'utf8');

console.log('\nListo:');
console.log(' ', keystorePath);
console.log(' ', propsPath);
console.log('\nCompilá release con: npm run mobile:android:apk:release');
console.log('AAB (Play Store): npm run mobile:android:bundle\n');
