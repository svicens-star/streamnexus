import React, { useMemo, useState } from 'react';
import {
  Search,
  Keyboard,
  ArrowDownAZ,
  Filter,
  Radio,
  Trophy,
  Newspaper,
  Sparkles,
  Play,
  ExternalLink,
  Trash2,
  MonitorPlay,
} from 'lucide-react';
import type { MediaCardItem } from './MediaCard';
import { OnScreenKeyboard } from './OnScreenKeyboard';
import type { ProgressRecord } from '../lib/progress';

export type ChannelsCategoryId =
  | 'all'
  | 'news'
  | 'sports'
  | 'movies'
  | 'kids'
  | 'series'
  | 'streaming'
  | 'apps';

const CATEGORIES: { id: ChannelsCategoryId; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'news', label: 'Noticias' },
  { id: 'sports', label: 'Deportes' },
  { id: 'movies', label: 'Cine' },
  { id: 'series', label: 'Series' },
  { id: 'kids', label: 'Infantiles' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'apps', label: 'Apps' },
];

const QUICK_FILTERS = [
  { label: 'Argentina', query: 'argentina', icon: Radio, accent: '#00F0FF' },
  { label: 'Pack Fútbol', query: 'pack fútbol', icon: Trophy, accent: '#00E676' },
  { label: 'Noticias', query: '', category: 'news' as ChannelsCategoryId, icon: Newspaper, accent: '#60A5FA' },
  { label: 'Streaming', query: '', category: 'streaming' as ChannelsCategoryId, icon: Sparkles, accent: '#A855F7' },
];

const CATEGORY_LABELS: Record<string, string> = {
  news: 'Noticias',
  sports: 'Deportes',
  movies: 'Cine',
  kids: 'Infantiles',
  series: 'Series',
  streaming: 'Streaming',
  apps: 'Apps',
};

const categoryLabel = (category?: string) => CATEGORY_LABELS[category || ''] || 'Canal';

const fallbackLogo = (item: MediaCardItem) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'TV')}&background=ffffff&color=111827&bold=true&format=svg`;

const stripUrlLike = (value: string) =>
  value
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\bwww\.\S+/gi, ' ')
    .replace(/tvg-logo\s*=\s*["']?[^"'\s]+["']?/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

const cleanText = (value: unknown) => stripUrlLike(String(value || ''));

const cleanChannelName = (item: MediaCardItem) => {
  const cleaned = cleanText(item.name);
  if (!cleaned) return 'Canal en vivo';
  return cleaned.length > 90 ? `${cleaned.slice(0, 90)}...` : cleaned;
};

const channelNowPlaying = (item: MediaCardItem) => {
  const liveInfo = cleanText(item.currentProgram || item.nowPlaying || '');
  if (liveInfo) return liveInfo;
  const cleanDescription = cleanText(item.description || '');
  if (cleanDescription) return cleanDescription;
  return cleanChannelName(item);
};

interface ChannelsBrowserProps {
  items: MediaCardItem[];
  onPlay: (item: MediaCardItem) => void;
  canDelete?: boolean;
  onDelete?: (item: MediaCardItem) => void;
  progressByItemId?: Record<string, ProgressRecord>;
  tvOnlyToggle?: { value: boolean; onChange: (v: boolean) => void };
}

const stripDiacritics = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const norm = (s: string) => stripDiacritics(String(s || '')).toLowerCase();

interface ChannelGuideCardProps {
  item: MediaCardItem;
  onPlay: (item: MediaCardItem) => void;
  canDelete?: boolean;
  onDelete?: (item: MediaCardItem) => void;
}

const ChannelGuideCard: React.FC<ChannelGuideCardProps> = ({
  item,
  onPlay,
  canDelete,
  onDelete,
}) => {
  const isExternal = Boolean(item.externalUrl && !item.streamUrl);
  const sourceLabel = item.streamUrl ? 'Player interno' : isExternal ? 'Vista web' : 'Catálogo';
  const tier = item.tierRequired || 'free';

  return (
    <article className="group relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#101116] shadow-2xl transition-all hover:-translate-y-1 hover:border-accent/50 focus-within:border-accent">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(0,240,255,0.12),transparent_35%)] opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex min-h-[190px] gap-4 p-4">
        <button
          type="button"
          onClick={() => onPlay(item)}
          className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl bg-white p-4 shadow-xl transition-transform group-hover:scale-[1.03] focus:outline-none focus-visible:ring-4 focus-visible:ring-accent"
          aria-label={`Ver ${item.name}`}
        >
          <img
            src={item.thumbnailUrl || fallbackLogo(item)}
            alt={item.name}
            className="max-h-full max-w-full object-contain"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        </button>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-danger/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-danger">
              Vivo
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white/60">
              {categoryLabel(item.category)}
            </span>
            {tier !== 'free' && (
              <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-accent">
                {tier}
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 text-xl font-black leading-tight tracking-tighter text-white">
            {cleanChannelName(item)}
          </h3>
          <p className="mt-2 line-clamp-2 text-xs font-medium leading-relaxed text-white/45">
            {channelNowPlaying(item)}
          </p>

          <div className="mt-auto flex items-center justify-between gap-3 pt-4">
            <div className="flex min-w-0 items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
              {item.streamUrl ? <MonitorPlay size={14} /> : <ExternalLink size={14} />}
              <span className="truncate">{sourceLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(item)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-danger/15 text-danger hover:bg-danger hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                  aria-label={`Eliminar ${item.name}`}
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => onPlay(item)}
                className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-bg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <Play size={14} fill="currentColor" />
                Ver ahora
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export const ChannelsBrowser: React.FC<ChannelsBrowserProps> = ({
  items,
  onPlay,
  canDelete,
  onDelete,
  progressByItemId,
  tvOnlyToggle,
}) => {
  const [search, setSearch] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [category, setCategory] = useState<ChannelsCategoryId>('all');
  const [sort, setSort] = useState<'name' | 'category' | 'tier'>('name');

  const filtered = useMemo(() => {
    const q = norm(search);
    let list = items;
    if (category !== 'all') {
      list = list.filter((i) => i.category === category);
    }
    if (q) {
      list = list.filter(
        (i) =>
          norm(i.name).includes(q) ||
          norm(i.currentProgram || i.nowPlaying || i.description || '').includes(q) ||
          norm(i.category || '').includes(q)
      );
    }
    list = [...list];
    list.sort((a, b) => {
      if (sort === 'name') return norm(a.name).localeCompare(norm(b.name));
      if (sort === 'category')
        return norm(a.category || '').localeCompare(norm(b.category || ''));
      const order = { free: 0, basic: 1, premium: 2 } as Record<string, number>;
      return (order[a.tierRequired || 'free'] || 0) - (order[b.tierRequired || 'free'] || 0);
    });
    return list;
  }, [items, search, category, sort]);

  const counts = useMemo(() => {
    const map: Partial<Record<ChannelsCategoryId, number>> = { all: items.length };
    for (const i of items) {
      const c = (i.category as ChannelsCategoryId) || 'news';
      map[c] = (map[c] || 0) + 1;
    }
    return map;
  }, [items]);

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#07080d] p-6 sm:p-8 lg:p-10 mb-8 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(0,240,255,0.22),transparent_35%),radial-gradient(circle_at_95%_15%,rgba(168,85,247,0.16),transparent_30%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-accent mb-3">
              Guía StreamNexus
            </p>
            <h2 className="text-4xl lg:text-6xl font-black tracking-tighter text-white">
              TV en vivo
            </h2>
            <p className="text-white/60 text-sm mt-3 max-w-2xl leading-relaxed">
              Canales argentinos, deportes, streaming y accesos oficiales ordenados para TV.
              Usá los filtros rápidos o buscá con el teclado en pantalla.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 min-w-[260px]">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div className="text-2xl font-black text-white">{items.length}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-white/45">Total</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div className="text-2xl font-black text-white">{counts.news || 0}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-white/45">Noticias</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div className="text-2xl font-black text-white">{counts.sports || 0}</div>
              <div className="text-[9px] font-black uppercase tracking-widest text-white/45">Deportes</div>
            </div>
          </div>
        </div>
        {tvOnlyToggle && (
          <button
            type="button"
            onClick={() => tvOnlyToggle.onChange(!tvOnlyToggle.value)}
            className={`relative mt-6 px-5 py-3 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              tvOnlyToggle.value
                ? 'bg-success/20 text-success border-success/40'
                : 'bg-surface-light text-text-dim border-white/10 hover:text-white'
            }`}
          >
            Solo compatibles TV: {tvOnlyToggle.value ? 'ON' : 'OFF'}
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_FILTERS.map((quick) => {
          const Icon = quick.icon;
          return (
            <button
              key={quick.label}
              type="button"
              onClick={() => {
                setSearch(quick.query);
                setCategory(quick.category || 'all');
              }}
              className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all"
            >
              <div
                className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl text-bg"
                style={{ backgroundColor: quick.accent }}
              >
                <Icon size={18} />
              </div>
              <div className="text-sm font-black uppercase tracking-tighter text-white">
                {quick.label}
              </div>
              <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/45">
                Abrir filtro
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-4 mb-8 rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={20}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-text-dim"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setShowKeyboard(true)}
              placeholder="Buscar canal, película o serie..."
              className="w-full bg-surface border border-white/10 rounded-2xl pl-14 pr-32 h-14 text-base text-white outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-24 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-text-dim hover:text-white"
              >
                Limpiar
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowKeyboard((s) => !s)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 px-3 h-10 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all ${
                showKeyboard
                  ? 'bg-accent text-bg'
                  : 'bg-surface-light text-text-dim hover:text-white'
              }`}
            >
              <Keyboard size={14} /> Teclado TV
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:flex items-center gap-1 px-3 h-14 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-text-dim">
              <ArrowDownAZ size={14} /> Orden
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="bg-surface border border-white/10 rounded-2xl px-4 h-14 text-sm text-white outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="name">Nombre A-Z</option>
              <option value="category">Categoría</option>
              <option value="tier">Plan</option>
            </select>
          </div>
        </div>

        {showKeyboard && (
          <OnScreenKeyboard
            value={search}
            onChange={setSearch}
            onClose={() => setShowKeyboard(false)}
          />
        )}

        <div className="flex flex-wrap gap-2">
          <span className="hidden lg:flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-text-dim mr-2">
            <Filter size={12} /> Filtrar
          </span>
          {CATEGORIES.map((c) => {
            const n = counts[c.id] || 0;
            if (c.id !== 'all' && n === 0) return null;
            const active = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  active
                    ? 'bg-accent text-bg border-accent shadow-lg'
                    : 'bg-surface-light text-text-dim border-white/10 hover:text-white'
                }`}
              >
                {c.label} ({n})
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <div className="text-[11px] font-black uppercase tracking-widest text-text-dim">
            {filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}
          </div>
          <p className="text-xs text-white/40 mt-1">
            Las tarjetas marcan si abren con player interno o vista web embebida.
          </p>
        </div>
        {(search || category !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCategory('all');
            }}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white"
          >
            Ver todo
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center text-text-dim">
          <p className="text-sm uppercase tracking-widest font-bold">
            No hay coincidencias para tu búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5 lg:gap-6">
          {filtered.map((item) => (
            <ChannelGuideCard
              key={item.id}
              item={item}
              onPlay={onPlay}
              canDelete={canDelete}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};
