import { Capacitor } from '@capacitor/core';

const DEFAULT_BASE44_APP = 'https://streamnexus-5595b36b.base44.app';

/**
 * Prefijo del proxy HLS (HTTPS). Env tiene prioridad; si no, en HTTPS usamos la función Base44 del mismo sitio o la app pública.
 */
export function getHlsHttpProxyPrefix(): string {
  const fromEnv = (import.meta.env.VITE_STREAM_PROXY_PREFIX as string | undefined)?.trim();
  if (fromEnv) {
    if (fromEnv.includes('{url}')) return fromEnv;
    if (fromEnv.includes('url=') || fromEnv.endsWith('=')) return fromEnv;
    return fromEnv.includes('?') ? `${fromEnv}&url=` : `${fromEnv}?url=`;
  }

  if (typeof window === 'undefined') {
    return '';
  }

  const proto = window.location.protocol;
  const host = window.location.hostname || '';

  if (proto === 'https:' && host.endsWith('base44.app')) {
    return `${window.location.origin}/functions/hlsHttpProxy?url=`;
  }

  if (proto === 'https:') {
    return `${DEFAULT_BASE44_APP}/functions/hlsHttpProxy?url=`;
  }

  if (Capacitor.isNativePlatform()) {
    return `${DEFAULT_BASE44_APP}/functions/hlsHttpProxy?url=`;
  }

  return '';
}

export function shouldProxyHttpStreams(): boolean {
  return getHlsHttpProxyPrefix().length > 0;
}

export function wrapHttpStreamUrlWithProxy(url: string): string {
  if (!url || !url.startsWith('http://')) return url;
  const prefix = getHlsHttpProxyPrefix();
  if (!prefix) return url;
  if (prefix.includes('{url}')) return prefix.replace(/\{url\}/g, encodeURIComponent(url));
  const joiner = prefix.endsWith('=') || prefix.endsWith('&') ? '' : '&';
  return `${prefix}${joiner}${encodeURIComponent(url)}`;
}

/**
 * Registra hook VHS para que manifest + segmentos .ts vayan por el proxy si siguen siendo http://
 */
export function attachVhsHttpProxyOnRequest(player: any, prefix: string): () => void {
  if (!prefix || !player) return () => {};

  const wrap = (uri: string) => {
    if (!uri || !String(uri).startsWith('http://')) return uri;
    if (prefix.includes('{url}')) return prefix.replace(/\{url\}/g, encodeURIComponent(uri));
    const joiner = prefix.endsWith('=') || prefix.endsWith('&') ? '' : '&';
    return `${prefix}${joiner}${encodeURIComponent(uri)}`;
  };

  const hook = (options: any) => {
    const uri = options?.uri;
    if (typeof uri === 'string' && uri.startsWith('http://')) {
      return { ...options, uri: wrap(uri) };
    }
    return options;
  };

  let attached = false;
  const tryAttach = () => {
    if (attached) return;
    try {
      const tech = player.tech?.(true);
      const xhr = tech?.vhs?.xhr;
      if (xhr?.onRequest) {
        xhr.onRequest(hook);
        attached = true;
      }
    } catch {
      /* ignore */
    }
  };

  const onXhrHooksReady = () => tryAttach();
  player.on?.('xhr-hooks-ready', onXhrHooksReady);
  player.ready?.(() => {
    tryAttach();
    queueMicrotask(() => tryAttach());
  });

  return () => {
    try {
      player.off?.('xhr-hooks-ready', onXhrHooksReady);
      const tech = player.tech?.(true);
      tech?.vhs?.xhr?.offRequest?.(hook);
    } catch {
      /* ignore */
    }
  };
}
