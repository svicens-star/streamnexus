import React, { useMemo } from 'react';
import { ExternalLink, Music2, Play, Radio, Sparkles, Trophy, Tv } from 'lucide-react';
import { motion } from 'motion/react';
import { BRANDS, type BrandMeta } from '../data/brands';
import type { MediaCardItem } from './MediaCard';
import type { ProgressRecord } from '../lib/progress';

interface HomeRowsProps {
  items: MediaCardItem[];
  progressByItemId: Record<string, ProgressRecord>;
  continueWatching: MediaCardItem[];
  onPlay: (item: MediaCardItem) => void;
  onOpenBrand: (brand: BrandMeta) => void;
  onOpenSection?: (section: 'channels' | 'movies' | 'series' | 'platforms' | 'music') => void;
}

const normalize = (value: unknown) =>
  String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const hasAny = (item: MediaCardItem, keywords: string[]) => {
  const haystack = normalize(`${item.name} ${item.description || ''} ${item.category || ''}`);
  return keywords.some((keyword) => haystack.includes(normalize(keyword)));
};

const ARGENTINA_LIVE_KEYWORDS = [
  'argentina',
  'telefe',
  'el trece',
  'eltrece',
  'tv publica',
  'america tv',
  'canal 9',
  'elnueve',
  'tn',
  'c5n',
  'a24',
  'la nacion',
  'ln+',
  'cronica',
  'canal 26',
  'tyc sports',
];

const FOOTBALL_PACK_KEYWORDS = [
  'pack futbol',
  'pack fútbol',
  'futbol',
  'fútbol',
  'liga profesional',
  'afa',
  'tyc sports',
  'tnt sports',
  'espn premium',
  'espn',
  'fox sports',
  'disney',
  'flow',
  'dgo',
  'telecentro',
  'deportv',
];

const isLiveLike = (i: MediaCardItem) =>
  i.mediaType === 'live' ||
  Boolean(i.streamUrl) ||
  Boolean(i.externalUrl && ['news', 'sports', 'streaming'].includes(String(i.category || '')));

export const HomeRows: React.FC<HomeRowsProps> = ({
  items,
  progressByItemId,
  continueWatching,
  onPlay,
  onOpenBrand,
  onOpenSection,
}) => {
  const liveChannels = useMemo(() => items.filter((i) => isLiveLike(i)), [items]);
  const movies = useMemo(
    () => items.filter((i: any) => i.mediaType === 'movie' || (!i.mediaType && i.category === 'movies')),
    [items]
  );
  const series = useMemo(
    () => items.filter((i: any) => i.mediaType === 'series' || (!i.mediaType && i.category === 'series')),
    [items]
  );
  const argentinaLive = useMemo(
    () => liveChannels.filter((i) => hasAny(i, ARGENTINA_LIVE_KEYWORDS)),
    [liveChannels]
  );
  const footballPack = useMemo(
    () =>
      items.filter((i) => {
        const looksLikeFootball = hasAny(i, FOOTBALL_PACK_KEYWORDS);
        const isSports = i.category === 'sports' || isLiveLike(i);
        return looksLikeFootball && isSports;
      }),
    [items]
  );

  const featured = useMemo(() => {
    const candidates = items.filter((i: any) => i.thumbnailUrl || i.backdropUrl);
    if (candidates.length === 0) return null;
    const scored = candidates
      .map((item) => ({
        item,
        score:
          (hasAny(item, FOOTBALL_PACK_KEYWORDS) ? 40 : 0) +
          (hasAny(item, ARGENTINA_LIVE_KEYWORDS) ? 25 : 0) +
          (item.mediaType === 'movie' || item.mediaType === 'series' ? 10 : 0) +
          (item.backdropUrl ? 5 : 0),
      }))
      .sort((a, b) => b.score - a.score);
    return scored[0].item;
  }, [items]);

  const editorialTiles = [
    {
      title: 'Argentina en vivo',
      eyebrow: 'TV nacional',
      subtitle: `${argentinaLive.length || liveChannels.length} señales y accesos destacados`,
      icon: Tv,
      accent: '#00F0FF',
      action: () => onOpenSection?.('channels'),
      image: argentinaLive[0]?.backdropUrl || argentinaLive[0]?.thumbnailUrl || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=900',
    },
    {
      title: 'Pack Fútbol',
      eyebrow: 'Match day',
      subtitle: `${footballPack.length} accesos deportivos oficiales y premium`,
      icon: Trophy,
      accent: '#00E676',
      action: () => onOpenSection?.('channels'),
      image: footballPack[0]?.backdropUrl || footballPack[0]?.thumbnailUrl || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=900',
    },
    {
      title: 'Música',
      eyebrow: 'Reproductor',
      subtitle: 'Buscá radios musicales y escuchá streams completos',
      icon: Music2,
      accent: '#60A5FA',
      action: () => onOpenSection?.('music'),
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900',
    },
  ];

  const featuredStats = [
    { label: 'En vivo', value: liveChannels.length },
    { label: 'Fútbol', value: footballPack.length },
    { label: 'Música', value: 1 },
    { label: 'Hubs', value: BRANDS.length },
  ];

  return (
    <div className="pb-16">
      <section className="px-4 sm:px-6 lg:px-10 pt-4">
        <div className="relative min-h-[470px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#07080d] shadow-2xl">
          {featured ? (
            <>
              <img
                src={(featured as any).backdropUrl || featured.thumbnailUrl}
                alt={featured.name}
                className="absolute inset-0 h-full w-full object-cover opacity-70"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#07080d] via-[#07080d]/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07080d] via-transparent to-black/40" />
            </>
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,240,255,0.28),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(168,85,247,0.24),transparent_30%),#07080d]" />
          )}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 flex min-h-[470px] flex-col justify-end p-6 sm:p-10 lg:p-12"
          >
            <div className="mb-6 max-w-2xl rounded-[1.7rem] border border-white/10 bg-black/45 p-5 backdrop-blur-xl">
              <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-accent">
                <Radio size={14} />
                StreamNexus TV
              </div>
              <h1 className="text-2xl font-black tracking-tighter text-white sm:text-4xl">
                TV en vivo, fútbol y música en una experiencia limpia para televisores
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-white/65">
                Portada simple, controles grandes y contenido ordenado para usar con control remoto.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {featured && (
                <button
                  type="button"
                  onClick={() => onPlay(featured)}
                  className="flex items-center gap-2 rounded-full bg-white px-7 py-3 text-xs font-black uppercase tracking-widest text-bg shadow-2xl transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent"
                >
                  <Play size={16} fill="currentColor" /> Reproducir
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenSection?.('channels')}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-3 text-xs font-black uppercase tracking-widest text-white backdrop-blur transition-all hover:bg-white/20 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent"
              >
                <Tv size={16} /> Explorar TV
              </button>
              <button
                type="button"
                onClick={() => onOpenSection?.('music')}
                className="flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-7 py-3 text-xs font-black uppercase tracking-widest text-white backdrop-blur transition-all hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent"
              >
                <Sparkles size={16} /> Música
              </button>
            </div>
            <div className="mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
              {featuredStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur">
                  <div className="text-2xl font-black text-white">{stat.value}</div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/45">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-accent">Entrar rápido</p>
          <h2 className="mt-1 text-2xl font-black tracking-tighter text-white lg:text-4xl">Elegí qué querés ver</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {editorialTiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <button
                key={tile.title}
                type="button"
                onClick={tile.action}
                className="group relative min-h-[190px] overflow-hidden rounded-[1.7rem] border border-white/10 bg-surface text-left shadow-2xl transition-all hover:-translate-y-1 hover:border-white/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent"
              >
                <img src={tile.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45 transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
                <div className="absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at top right, ${tile.accent}44, transparent 45%)` }} />
                <div className="relative flex min-h-[190px] flex-col justify-between p-5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white/70 backdrop-blur">{tile.eyebrow}</span>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-bg shadow-lg" style={{ backgroundColor: tile.accent }}>
                      <Icon size={20} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tighter text-white">{tile.title}</h3>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-white/60">{tile.subtitle}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-4 pb-4 sm:px-6 lg:px-10">
        <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              <h2 className="text-xs font-black uppercase tracking-[0.25em] text-white/65">Hubs premium</h2>
            </div>
            <button type="button" onClick={() => onOpenSection?.('platforms')} className="text-[10px] font-black uppercase tracking-widest text-accent hover:underline">
              Ver todos
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {BRANDS.map((b) => (
              <button key={b.id} type="button" onClick={() => onOpenBrand(b)} className="group relative flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 p-4 text-left transition-all hover:border-white/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent" style={{ width: 210, background: b.gradient }}>
                <img src={b.backdropUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 transition-opacity group-hover:opacity-35" referrerPolicy="no-referrer" />
                <div className="relative flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl shadow-lg" style={{ backgroundColor: b.color }}>
                    <span className="text-base font-black text-white">{b.shortLabel[0]}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black uppercase tracking-tighter text-white">{b.shortLabel}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/55">Catálogo hub</p>
                  </div>
                  <ExternalLink size={14} className="ml-auto text-white/45" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
