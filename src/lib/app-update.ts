export interface AppUpdateManifest {
  latestVersion: string;
  apkDownloadUrl?: string;
  releasesUrl?: string;
  message?: string;
}

/** Compara semver simple (major.minor.patch). Devuelve 1 si a > b, -1 si a < b, 0 si iguales. */
export function compareSemver(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .replace(/^v/i, '')
      .split(/[.+-]/)
      .filter((p) => /^\d+$/.test(p))
      .map((n) => parseInt(n, 10) || 0);
  const pa = norm(a);
  const pb = norm(b);
  const len = Math.max(pa.length, pb.length, 3);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da < db) return -1;
    if (da > db) return 1;
  }
  return 0;
}

export async function fetchAppUpdateManifest(url: string): Promise<AppUpdateManifest | null> {
  const u = url.trim();
  if (!u) return null;
  try {
    const sep = u.includes('?') ? '&' : '?';
    const res = await fetch(`${u}${sep}_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as AppUpdateManifest;
    if (!data?.latestVersion || typeof data.latestVersion !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}
