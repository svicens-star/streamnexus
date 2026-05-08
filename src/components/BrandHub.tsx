import React, { useEffect, useMemo } from 'react';
import { ArrowLeft, ExternalLink, Play } from 'lucide-react';
import { motion } from 'motion/react';
import type { BrandMeta } from '../data/brands';
import { genreLabel } from '../data/brands';
import { MediaRow } from './MediaRow';
import type { MediaCardItem } from './MediaCard';
import type { ProgressRecord } from '../lib/progress';

interface BrandHubProps {
  brand: BrandMeta;
  items: MediaCardItem[];
  progressByItemId: Record<string, ProgressRecord>;
  onPlay: (item: MediaCardItem) => void;
  onClose: () => void;
  onOpenOfficial: (brand: BrandMeta) => void;
}

const itemMatchesBrand = (item: any, brandId: string): boolean => {
  const platforms: string[] = Array.isArray(item.platforms) ? item.platforms : [];
  if (platforms.includes(brandId)) return true;
  return false;
};

export const BrandHub: React.FC<BrandHubProps> = ({
  brand,
  items,
  progressByItemId,
  onPlay,
  onClose,
  onOpenOfficial,
}) => {
  const brandItems = useMemo(
    () => items.filter((i) => itemMatchesBrand(i as any, brand.id)),
    [items, brand.id]
  );

  const continueWatching = useMemo(() => {
    return brandItems.filter((i) => {
      const p = progressByItemId[i.id];
      return p && p.percent > 0.02 && p.percent < 0.95;
    });
  }, [brandItems, progressByItemId]);

  const movies = useMemo(
    () => brandItems.filter((i: any) => i.mediaType === 'movie'),
    [brandItems]
  );
  const series = useMemo(
    () => brandItems.filter((i: any) => i.mediaType === 'series'),
    [brandItems]
  );

  const allGenres = useMemo(() => {
    const set = new Map<string, MediaCardItem[]>();
    for (const it of brandItems) {
      const gs: string[] = Array.isArray((it as any).genres) ? (it as any).genres : [];
      for (const g of gs) {
        if (!set.has(g)) set.set(g, []);
        set.get(g)!.push(it);
      }
    }
    return Array.from(set.entries())
      .map(([id, list]) => ({ id, list }))
      .sort((a, b) => b.list.length - a.list.length);
  }, [brandItems]);

  const featured = useMemo(() => {
    const withBackdrop = brandItems.find((i) => (i as any).backdropUrl);
    return withBackdrop || brandItems[0] || null;
  }, [brandItems]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') {
        e.preventDefault();
        onClose();
      }
    };
    const onPop = () => onClose();
    try {
      window.history.pushState({ brandHub: brand.id }, '');
    } catch {
      /* ignore */
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('popstate', onPop);
    };
  }, [onClose, brand.id]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] bg-bg overflow-y-auto"
    >
      <div
        className="relative h-[420px] lg:h-[520px] w-full overflow-hidden"
        style={{
          background: brand.gradient,
        }}
      >
        {(featured?.backdropUrl || (featured as any)?.thumbnailUrl || brand.backdropUrl) && (
          <img
            src={
              (featured as any)?.backdropUrl ||
              featured?.thumbnailUrl ||
              brand.backdropUrl
            }
            alt={brand.label}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, transparent 30%, var(--color-bg) 100%), linear-gradient(90deg, ${brand.color}33 0%, transparent 70%)`,
          }}
        />
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 left-6 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur text-white border border-white/10 hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-all"
        >
          <ArrowLeft size={18} /> Volver
        </button>

        <div className="absolute bottom-12 left-6 lg:left-12 right-6 lg:right-12 z-10">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 lg:w-16 lg:h-16 rounded-2xl flex items-center justify-center shadow-2xl"
              style={{ backgroundColor: brand.color }}
            >
              <span className="text-2xl lg:text-3xl font-black text-white">
                {brand.shortLabel[0]}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-white/70">
                Hub StreamNexus
              </p>
              <h1
                className="text-4xl lg:text-6xl font-black tracking-tighter italic uppercase"
                style={{ color: brand.textColor }}
              >
                {brand.label}
              </h1>
            </div>
          </div>
          <p className="text-text-dim text-sm lg:text-base max-w-2xl mb-6">
            {featured?.description || brand.blurb}
          </p>
          <div className="flex flex-wrap gap-3">
            {featured && (
              <button
                type="button"
                onClick={() => onPlay(featured)}
                className="bg-white text-bg px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-2xl flex items-center gap-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent"
              >
                <Play size={16} fill="currentColor" /> Reproducir destacado
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenOfficial(brand)}
              className="px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest border border-white/30 text-white hover:bg-white/10 focus:outline-none focus-visible:ring-4 focus-visible:ring-accent transition-all flex items-center gap-2"
            >
              <ExternalLink size={16} /> Abrir app oficial
            </button>
          </div>
        </div>
      </div>

      <div className="pb-20">
        {brandItems.length === 0 ? (
          <div className="px-6 lg:px-12 py-16 text-center">
            <p className="text-text-dim text-sm uppercase tracking-widest font-bold mb-4">
              Aún no tenés contenido propio asignado a {brand.label}.
            </p>
            <p className="text-text-dim text-xs max-w-xl mx-auto leading-relaxed mb-8">
              Desde el panel admin podés cargar películas o series y marcar la plataforma{' '}
              <span className="text-accent font-black">{brand.label}</span> para que aparezcan en
              este hub. Mientras tanto podés abrir la app oficial.
            </p>
            <button
              type="button"
              onClick={() => onOpenOfficial(brand)}
              className="bg-accent text-bg px-8 py-4 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-all"
            >
              Abrir {brand.label}
            </button>
          </div>
        ) : (
          <>
            {continueWatching.length > 0 && (
              <MediaRow
                title={`Continuar viendo en ${brand.label}`}
                items={continueWatching}
                progressByItemId={progressByItemId}
                onPlay={onPlay}
                layout="landscape"
                highlightColor={brand.color}
              />
            )}
            {movies.length > 0 && (
              <MediaRow
                title="Películas"
                items={movies}
                progressByItemId={progressByItemId}
                onPlay={onPlay}
                layout="poster"
                highlightColor={brand.color}
              />
            )}
            {series.length > 0 && (
              <MediaRow
                title="Series"
                items={series}
                progressByItemId={progressByItemId}
                onPlay={onPlay}
                layout="poster"
                highlightColor={brand.color}
              />
            )}
            {allGenres
              .filter((g) => g.list.length >= 2)
              .map((g) => (
                <MediaRow
                  key={g.id}
                  title={genreLabel(g.id)}
                  items={g.list}
                  progressByItemId={progressByItemId}
                  onPlay={onPlay}
                  layout="poster"
                  highlightColor={brand.color}
                />
              ))}
          </>
        )}
      </div>
    </motion.div>
  );
};
