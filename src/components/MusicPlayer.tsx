import React, { useEffect, useMemo, useState } from 'react';
import { Music2, Search, RefreshCw, AlertCircle } from 'lucide-react';

interface YoutubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      medium?: { url?: string };
      high?: { url?: string };
      default?: { url?: string };
    };
  };
}

interface YoutubeSearchResponse {
  items?: YoutubeSearchItem[];
  error?: {
    message?: string;
    status?: string;
    details?: Array<{ reason?: string }>;
    errors?: Array<{ reason?: string; message?: string }>;
  };
}

interface MusicResult {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
}

const QUICK_SEARCHES = ['Duki', 'Bizarrap', 'Maluma', 'Bad Bunny', 'Emilia', 'Rock nacional', 'Cumbia argentina'];
const FALLBACK_VIDEO_ID = 'kJQP7kiw5Fk';
const SEARCH_LIMIT = 25;

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');

const mapYoutubeItem = (item: YoutubeSearchItem): MusicResult | null => {
  const id = item.id?.videoId;
  if (!id) return null;
  return {
    id,
    title: item.snippet?.title || 'Video musical',
    channel: item.snippet?.channelTitle || 'Canal',
    thumbnail:
      item.snippet?.thumbnails?.high?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
};

export const MusicPlayer: React.FC = () => {
  const [input, setInput] = useState('Duki');
  const [query, setQuery] = useState('Duki');
  const [results, setResults] = useState<MusicResult[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [error, setError] = useState('');

  const apiKey = import.meta.env.VITE_YT_API_KEY?.trim() || '';
  const hasApiKey = Boolean(apiKey);
  const selected = useMemo(
    () => results.find((item) => item.id === selectedId) || results[0] || null,
    [results, selectedId]
  );

  const playerUrl = `https://www.youtube-nocookie.com/embed/${selected?.id || FALLBACK_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`;

  useEffect(() => {
    if (!hasApiKey) {
      setResults([]);
      setSelectedId('');
      setError('Falta configurar VITE_YT_API_KEY para habilitar la búsqueda de canciones.');
      return;
    }

    const controller = new AbortController();
    const run = async () => {
      const q = normalize(query);
      if (!q) return;
      setLoading(true);
      setError('');
      try {
        const url = new URL('https://www.googleapis.com/youtube/v3/search');
        url.searchParams.set('part', 'snippet');
        url.searchParams.set('type', 'video');
        url.searchParams.set('videoCategoryId', '10'); // música
        url.searchParams.set('maxResults', String(SEARCH_LIMIT));
        url.searchParams.set('q', `${q} oficial`);
        url.searchParams.set('key', apiKey);

        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) {
          const errorData = (await res.json()) as YoutubeSearchResponse;
          const reason =
            errorData.error?.details?.[0]?.reason ||
            errorData.error?.errors?.[0]?.reason ||
            errorData.error?.status ||
            '';
          const message = errorData.error?.message || '';
          throw new Error(`youtube-api-${res.status}:${reason}:${message}`);
        }

        const data = (await res.json()) as YoutubeSearchResponse;
        const mapped = (data.items || []).map(mapYoutubeItem).filter(Boolean) as MusicResult[];
        if (!mapped.length) {
          setResults([]);
          setSelectedId('');
          setError('No encontré resultados para esa búsqueda. Probá con otro artista o canción.');
          return;
        }
        setResults(mapped);
        setSelectedId(mapped[0].id);
      } catch (err) {
        if (controller.signal.aborted) return;
        setResults([]);
        setSelectedId('');
        const message = err instanceof Error ? err.message : '';
        if (message.includes('API_KEY_SERVICE_BLOCKED')) {
          setError('Tu API key está bloqueada para YouTube Data API v3. Activá YouTube Data API v3 en Google Cloud para este proyecto.');
        } else if (message.includes('API key not valid')) {
          setError('La API key no es válida. Verificá que esté bien copiada en VITE_YT_API_KEY.');
        } else if (message.includes('PERMISSION_DENIED') || message.includes('forbidden')) {
          setError('Permiso denegado por restricciones de la API key. Revisá restricciones de aplicación/API en Google Cloud.');
        } else if (message.includes('quota')) {
          setError('Se alcanzó la cuota de YouTube API para hoy. Probá mañana o aumentá cuota en Google Cloud.');
        } else {
          setError('No se pudo buscar en YouTube API. Revisá API key, YouTube Data API v3 y restricciones del proyecto.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    run();
    return () => controller.abort();
  }, [query, reloadTick, hasApiKey, apiKey]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = normalize(input);
    if (!q) return;
    setQuery(q);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8">
      <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#07080d] shadow-2xl">
        <div className="border-b border-white/10 bg-white/[0.035] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-accent">
                <Music2 size={13} />
                Reproductor interno (YouTube API)
              </div>
              <h1 className="text-2xl font-black tracking-tighter text-white lg:text-4xl">Música dentro de la app</h1>
              <p className="mt-1 text-sm text-white/55">Busca cualquier canción y reproducila sin salir de StreamNexus.</p>
            </div>

            <form onSubmit={submit} className="relative w-full lg:max-w-xl">
              <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Buscar canción o artista..."
                className="h-14 w-full rounded-2xl border border-white/10 bg-black/35 pl-12 pr-28 text-white outline-none transition-all focus:border-accent focus-visible:ring-2 focus-visible:ring-accent"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-accent px-4 py-2 text-[10px] font-black uppercase tracking-widest text-bg"
              >
                Buscar
              </button>
            </form>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {QUICK_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => {
                  setInput(term);
                  setQuery(term);
                }}
                className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/10 hover:text-white"
              >
                {term}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setReloadTick((prev) => prev + 1)}
              className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-accent hover:bg-accent/20"
            >
              <RefreshCw size={13} />
              Reintentar
            </button>
          </div>

          {error && (
            <div className="mt-3 inline-flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px]">
          <div className="relative bg-black">
            <iframe
              key={`${selected?.id || FALLBACK_VIDEO_ID}-${query}`}
              src={playerUrl}
              title={selected?.title || 'YouTube Music Player'}
              className="h-[78vh] min-h-[640px] w-full border-0"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
            />
            {loading && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white/85">
                Buscando canciones...
              </div>
            )}
          </div>

          <aside className="border-t border-white/10 bg-[#0b0f17] p-4 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-white/70">Resultados</h2>
              <span className="text-[10px] text-white/40">{loading ? 'Cargando...' : `${results.length}`}</span>
            </div>
            <div className="grid max-h-[72vh] gap-3 overflow-y-auto pr-1 scrollbar-hide">
              {results.map((video) => {
                const active = video.id === selected?.id;
                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setSelectedId(video.id)}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      active ? 'border-accent/60 bg-accent/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08]'
                    }`}
                  >
                    <div className="flex gap-3">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="h-14 w-24 rounded-lg object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-xs font-black text-white">{video.title}</p>
                        <p className="mt-1 truncate text-[10px] text-white/50">{video.channel}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {!loading && !results.length && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/55">
                  No hay resultados todavía. Configurá la API key y buscá un artista.
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};
