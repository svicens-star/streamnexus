import { app, BrowserWindow, ipcMain, shell, net, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { autoUpdater } from 'electron-updater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;
const rendererUrl = process.env.ELECTRON_RENDERER_URL;

function sendUpdaterEvent(win, payload) {
  if (win && !win.isDestroyed()) {
    win.webContents.send('updater:event', payload);
  }
}

let autoUpdaterListenersBound = false;
let updaterIpcRegistered = false;
let appMetaIpcRegistered = false;

/** Carpeta HTTPS pública con latest.yml + instalador (termina en /). Solo HTTPS. */
function resolveUpdateBaseUrl() {
  if (!app.isPackaged) return null;
  const envUrl = process.env.STREAMNEXUS_UPDATES_URL?.trim();
  if (envUrl) {
    const base = envUrl.replace(/\/+$/, '') + '/';
    if (/^https:\/\//i.test(base)) return base;
    return null;
  }
  try {
    const ymlPath = path.join(process.resourcesPath, 'app-update.yml');
    if (!fs.existsSync(ymlPath)) return null;
    const txt = fs.readFileSync(ymlPath, 'utf8');
    const m = txt.match(/^url:\s*(.+)$/m);
    const u = m?.[1]?.trim();
    if (!u) return null;
    if (/REEMPLAZA|PLACEHOLDER|YOURDOMAIN|TU-DOMINIO|example\.com/i.test(u)) return null;
    const normalized = u.endsWith('/') ? u : `${u}/`;
    if (!/^https:\/\//i.test(normalized)) return null;
    return normalized;
  } catch {
    return null;
  }
}

function registerAppMetaIpcOnce() {
  if (appMetaIpcRegistered) return;
  appMetaIpcRegistered = true;
  ipcMain.handle('app:get-meta', () => ({
    version: app.getVersion(),
    autoUpdateConfigured: Boolean(resolveUpdateBaseUrl()),
  }));
}

function getPrimaryWindow() {
  const wins = BrowserWindow.getAllWindows();
  return wins[0] || null;
}

function registerUpdaterIpcOnce() {
  if (updaterIpcRegistered) return;
  updaterIpcRegistered = true;

  ipcMain.handle('updater:check', async () => {
    if (!app.isPackaged) {
      return { ok: false, error: 'Solo en la app instalada (Electron empaquetado).' };
    }
    try {
      const r = await autoUpdater.checkForUpdates();
      return { ok: true, version: r?.updateInfo?.version };
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    }
  });

  ipcMain.handle('updater:install', () => {
    if (!app.isPackaged) return false;
    autoUpdater.quitAndInstall(false, true);
    return true;
  });
}

function setupAutoUpdater() {
  registerUpdaterIpcOnce();
  if (!app.isPackaged || autoUpdaterListenersBound) return;

  const updateBase = resolveUpdateBaseUrl();
  if (!updateBase) {
    console.log(
      '[StreamNexus] Actualizaciones automáticas desactivadas (sin URL HTTPS válida). Instalá cada versión nueva con el .exe, o definí la variable de entorno STREAMNEXUS_UPDATES_URL y volvé a empaquetar con build.publish en package.json.'
    );
    return;
  }

  autoUpdaterListenersBound = true;
  autoUpdater.setFeedURL({ provider: 'generic', url: updateBase });

  autoUpdater.autoDownload = true;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on('checking-for-update', () => {
    sendUpdaterEvent(getPrimaryWindow(), { kind: 'checking' });
  });
  autoUpdater.on('update-available', (info) => {
    sendUpdaterEvent(getPrimaryWindow(), { kind: 'available', version: info.version });
  });
  autoUpdater.on('update-not-available', () => {
    sendUpdaterEvent(getPrimaryWindow(), { kind: 'none' });
  });
  autoUpdater.on('error', (err) => {
    sendUpdaterEvent(getPrimaryWindow(), { kind: 'error', message: String(err?.message || err) });
  });
  autoUpdater.on('download-progress', (p) => {
    sendUpdaterEvent(getPrimaryWindow(), { kind: 'progress', percent: p.percent });
  });
  autoUpdater.on('update-downloaded', (info) => {
    sendUpdaterEvent(getPrimaryWindow(), { kind: 'downloaded', version: info.version });
    const mainWindow = getPrimaryWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        buttons: ['Reiniciar ahora', 'Más tarde'],
        defaultId: 0,
        cancelId: 1,
        title: 'StreamNexus',
        message: 'Actualización lista',
        detail: `Versión ${info.version} descargada. Reiniciá la app para aplicarla (no hace falta volver a instalar el instalador).`,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      })
      .catch(() => {});
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 8000);

  const sixHours = 6 * 60 * 60 * 1000;
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, sixHours);
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1500,
    height: 920,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#0A0B0D',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
  });

  if (rendererUrl) {
    win.loadURL(rendererUrl);
  } else if (isDev) {
    win.loadURL('http://localhost:3000');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  return win;
}

function openPlatformWindow(url) {
  const platformWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      webSecurity: false,
      allowRunningInsecureContent: true,
      sandbox: true,
    },
  });
  platformWindow.loadURL(url);
  return true;
}

function probeUrl(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    try {
      const request = net.request({ method: 'GET', url, redirect: 'follow' });
      const timeout = setTimeout(() => {
        try {
          request.abort();
        } catch {}
        finish({ url, ok: false, status: 0, error: 'timeout' });
      }, timeoutMs);

      request.on('response', (response) => {
        clearTimeout(timeout);
        const status = response.statusCode || 0;
        const ok = status >= 200 && status < 400;
        finish({ url, ok, status, error: ok ? null : `http_${status}` });
        try {
          request.abort();
        } catch {}
      });

      request.on('error', (error) => {
        clearTimeout(timeout);
        finish({ url, ok: false, status: 0, error: error?.message || 'network_error' });
      });

      request.end();
    } catch (error) {
      finish({ url, ok: false, status: 0, error: error?.message || 'probe_error' });
    }
  });
}

async function diagnoseStream(urls) {
  const uniqueUrls = Array.from(new Set((urls || []).filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u))));
  const attempts = [];
  const healthy = [];
  for (const url of uniqueUrls) {
    const result = await probeUrl(url);
    attempts.push(result);
    if (result.ok) {
      healthy.push(url);
    }
  }
  const bestUrl = healthy.find((u) => u.startsWith('https://')) || healthy[0] || null;
  return { ok: healthy.length > 0, bestUrl, attempts };
}

app.whenReady().then(() => {
  registerAppMetaIpcOnce();
  createMainWindow();
  setupAutoUpdater();

  ipcMain.handle('platform:open-window', (_event, url) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return false;
    return openPlatformWindow(url);
  });

  ipcMain.handle('platform:open-external', (_event, url) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return false;
    shell.openExternal(url);
    return true;
  });

  ipcMain.handle('stream:probe', async (_event, urls) => {
    return diagnoseStream(Array.isArray(urls) ? urls : []);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
