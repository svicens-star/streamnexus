import React, { useCallback, useEffect, useState } from 'react';
import { Download, Monitor, RefreshCw, Sparkles } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { AppLauncher } from '@capacitor/app-launcher';
import { toast } from 'sonner';
import {
  compareSemver,
  fetchAppUpdateManifest,
  type AppUpdateManifest,
} from '../lib/app-update';

const DEFAULT_MANIFEST_URL =
  'https://cdn.jsdelivr.net/gh/svicens-star/streamnexus@main/public/app-update-manifest.json';

interface AppUpdatePanelProps {
  /** URL del manifiesto (VITE_APP_UPDATE_MANIFEST_URL o CDN por defecto). */
  manifestUrl?: string;
  fallbackApkUrl?: string;
  releasesUrl?: string;
}

export const AppUpdatePanel: React.FC<AppUpdatePanelProps> = ({
  manifestUrl,
  fallbackApkUrl,
  releasesUrl,
}) => {
  const currentVersion = import.meta.env.VITE_APP_VERSION || '0.0.0';
  const resolvedManifest =
    (import.meta.env.VITE_APP_UPDATE_MANIFEST_URL || '').trim() ||
    manifestUrl ||
    DEFAULT_MANIFEST_URL;
  const resolvedApk =
    fallbackApkUrl ||
    (import.meta.env.VITE_ANDROID_APK_URL || '').trim() ||
    'https://cdn.jsdelivr.net/gh/svicens-star/streamnexus@main/public/downloads/StreamNexus-TV-install.apk';
  const resolvedReleases =
    releasesUrl ||
    (import.meta.env.VITE_ANDROID_RELEASES_URL || '').trim() ||
    'https://github.com/svicens-star/streamnexus/releases/latest';

  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.getAppMeta);
  const isNative = Capacitor.isNativePlatform();

  const [manifest, setManifest] = useState<AppUpdateManifest | null>(null);
  const [nativeChecking, setNativeChecking] = useState(false);
  const [nativeError, setNativeError] = useState<string | null>(null);
  const [electronMeta, setElectronMeta] = useState<{
    version: string;
    autoUpdateConfigured: boolean;
  } | null>(null);
  const [electronChecking, setElectronChecking] = useState(false);
  const [electronUpdateReady, setElectronUpdateReady] = useState(false);

  const checkNative = useCallback(async () => {
    setNativeChecking(true);
    setNativeError(null);
    try {
      const m = await fetchAppUpdateManifest(resolvedManifest);
      setManifest(m);
      if (!m) {
        setNativeError('No se pudo leer el manifiesto de versiones.');
        return;
      }
      if (compareSemver(m.latestVersion, currentVersion) > 0) {
        toast.message('Hay una versión nueva', {
          description: `Disponible: ${m.latestVersion} · Tienes: ${currentVersion}`,
          duration: 6000,
        });
      }
    } finally {
      setNativeChecking(false);
    }
  }, [resolvedManifest, currentVersion]);

  useEffect(() => {
    if (!isNative) return;
    void checkNative();
  }, [isNative, checkNative]);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.getAppMeta) return;
    void window.electronAPI.getAppMeta().then(setElectronMeta).catch(() => {});
  }, [isElectron]);

  useEffect(() => {
    if (!isElectron || !window.electronAPI?.subscribeUpdater) return;
    const unsub = window.electronAPI.subscribeUpdater((evt) => {
      if (evt.kind === 'downloaded') setElectronUpdateReady(true);
    });
    return () => unsub();
  }, [isElectron]);

  const openApkDownload = async (url: string) => {
    try {
      await AppLauncher.openUrl({ url });
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleElectronCheck = async () => {
    const api = window.electronAPI;
    if (!api?.checkForUpdates) return;
    setElectronChecking(true);
    try {
      const r = await api.checkForUpdates();
      if (r.ok) {
        toast.success('Búsqueda completada', {
          description: r.version
            ? `Última versión en el servidor: ${r.version}`
            : 'No se reportó una versión nueva.',
        });
      } else {
        toast.error(r.error || 'No se pudo buscar actualizaciones');
      }
    } finally {
      setElectronChecking(false);
    }
  };

  const handleElectronInstall = async () => {
    const ok = await window.electronAPI?.installUpdate?.();
    if (!ok) toast.error('No se pudo iniciar la instalación');
  };

  if (!isNative && !isElectron) {
    return null;
  }

  const nativeNeedsUpdate =
    isNative &&
    manifest &&
    compareSemver(manifest.latestVersion, currentVersion) > 0;
  const apkTarget = manifest?.apkDownloadUrl || resolvedApk;

  return (
    <section className="px-6 lg:px-12 py-6">
      <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3 bg-surface/50">
          <Sparkles className="w-5 h-5 text-accent shrink-0" />
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">
              Actualización de la app
            </h3>
            <p className="text-[11px] text-text-dim mt-0.5">
              Versión instalada:{' '}
              <span className="text-accent font-bold">{currentVersion}</span>
              {isElectron && electronMeta?.version ? (
                <span className="text-text-dim"> · Electron: {electronMeta.version}</span>
              ) : null}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {isNative && (
            <>
              {nativeNeedsUpdate ? (
                <div className="rounded-2xl border border-accent/40 bg-accent/10 p-5">
                  <p className="text-white font-black text-sm uppercase tracking-tight mb-1">
                    Nueva versión disponible: {manifest!.latestVersion}
                  </p>
                  {manifest!.message ? (
                    <p className="text-text-dim text-xs mb-4 leading-relaxed">{manifest!.message}</p>
                  ) : (
                    <p className="text-text-dim text-xs mb-4">
                      Descargá el APK e instalá encima para actualizar (misma firma si usás el mismo
                      keystore).
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void openApkDownload(apkTarget)}
                      className="inline-flex items-center gap-2 bg-accent text-bg px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Download size={16} />
                      Descargar actualización
                    </button>
                    {(manifest!.releasesUrl || resolvedReleases) && (
                      <button
                        type="button"
                        onClick={() =>
                          void openApkDownload(manifest!.releasesUrl || resolvedReleases)
                        }
                        className="inline-flex items-center gap-2 bg-white/10 text-white px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest border border-white/15 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        Ver releases
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-text-dim text-xs">
                  {nativeChecking
                    ? 'Comprobando si hay novedades…'
                    : nativeError
                      ? nativeError
                      : manifest
                        ? `Estás al día con el manifiesto (${manifest.latestVersion}).`
                        : 'No se pudo verificar la última versión en línea.'}
                </p>
              )}
              <button
                type="button"
                disabled={nativeChecking}
                onClick={() => void checkNative()}
                className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-accent hover:underline disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md px-1"
              >
                <RefreshCw size={14} className={nativeChecking ? 'animate-spin' : ''} />
                Comprobar de nuevo
              </button>
            </>
          )}

          {isElectron && (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Monitor size={18} className="text-text-dim" />
                <span className="text-[11px] font-black uppercase tracking-widest text-text-dim">
                  Escritorio Windows
                </span>
              </div>
              <p className="text-text-dim text-xs mb-4 leading-relaxed">
                {electronMeta?.autoUpdateConfigured
                  ? 'Las actualizaciones se buscan contra el feed HTTPS configurado en el instalador.'
                  : 'Sin feed HTTPS de actualizaciones: instalá un Setup .exe nuevo cuando publiques versión.'}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={electronChecking}
                  onClick={() => void handleElectronCheck()}
                  className="inline-flex items-center gap-2 bg-white/10 text-white px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest border border-white/15 hover:bg-white/15 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <RefreshCw size={16} className={electronChecking ? 'animate-spin' : ''} />
                  Buscar actualizaciones
                </button>
                {electronUpdateReady && (
                  <button
                    type="button"
                    onClick={() => void handleElectronInstall()}
                    className="inline-flex items-center gap-2 bg-accent text-bg px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Instalar y reiniciar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
