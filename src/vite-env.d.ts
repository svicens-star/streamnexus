/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string;
  /** URL directa al .apk (p. ej. asset de un GitHub Release). */
  readonly VITE_ANDROID_APK_URL?: string;
  /** Página de releases (p. ej. …/releases/latest). */
  readonly VITE_ANDROID_RELEASES_URL?: string;
  /** Enlace a la ficha en Google Play (cuando publiques el AAB). */
  readonly VITE_GOOGLE_PLAY_URL?: string;
  /** JSON público con latestVersion + apkDownloadUrl (p. ej. en public/ o jsDelivr). */
  readonly VITE_APP_UPDATE_MANIFEST_URL?: string;
  /** API key de YouTube Data API v3 para buscador de música interno. */
  readonly VITE_YT_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.m3u?raw' {
  const content: string;
  export default content;
}

interface Window {
  electronAPI?: {
    getAppMeta: () => Promise<{ version: string; autoUpdateConfigured: boolean }>;
    openPlatformWindow: (url: string) => Promise<boolean>;
    openExternal: (url: string) => Promise<boolean>;
    diagnoseStream: (urls: string[]) => Promise<{
      ok: boolean;
      bestUrl: string | null;
      attempts: Array<{ url: string; ok: boolean; status: number; error: string | null }>;
    }>;
    checkForUpdates: () => Promise<{ ok: boolean; version?: string; error?: string }>;
    installUpdate: () => Promise<boolean>;
    subscribeUpdater: (
      callback: (evt: {
        kind: string;
        version?: string;
        message?: string;
        percent?: number;
      }) => void
    ) => () => void;
  };
}
