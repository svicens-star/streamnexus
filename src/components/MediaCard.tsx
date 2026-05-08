import React from 'react';
import { ExternalLink, Play, Radio, ShieldCheck, Trash2 } from 'lucide-react';
import type { ProgressRecord } from '../lib/progress';

export type MediaCardLayout = 'poster' | 'landscape' | 'square';

export interface MediaCardItem {
  id: string;
  name: string;
  thumbnailUrl?: string;
  backdropUrl?: string;
  description?: string;
  currentProgram?: string;
  nowPlaying?: string;
  category?: string;
  tierRequired?: string;
  mediaType?: 'live' | 'movie' | 'series';
  externalUrl?: string;
  streamUrl?: string;
}

interface MediaCardProps {
  item: MediaCardItem;
  layout?: MediaCardLayout;
  progress?: ProgressRecord | null;
  onPlay: (item: MediaCardItem) => void;
  canDelete?: boolean;
  onDelete?: (item: MediaCardItem) => void;
  badge?: string;
  width?: number;
}

const layoutClasses: Record<MediaCardLayout, string> = {
  poster: 'aspect-[2/3]',
  landscape: 'aspect-video',
  square: 'aspect-square',
};

const CATEGORY_LABELS: Record<string, string> = {
  news: 'Noticias',
  sports: 'Deportes',
  movies: 'Películas',
  kids: 'Infantil',
  series: 'Series',
  streaming: 'Streaming',
  apps: 'Apps',
};

const categoryLabel = (category?: string) =>
  CATEGORY_LABELS[category || ''] || (category ? category : 'Canal');

export const MediaCard: React.FC<MediaCardProps> = ({
  item,
  layout = 'landscape',
  progress,
  onPlay,
  canDelete = false,
  onDelete,
  badge,
  width,
}) => {
  if (!item) return null;
  const percent = progress ? Math.round(progress.percent * 100) : 0;
  const showProgress = !!progress && progress.percent > 0.02 && progress.percent < 0.98;
  const isExternal = Boolean(item.externalUrl && !item.streamUrl);
  const isLive =
    item.mediaType === 'live' ||
    (!item.mediaType && Boolean(item.streamUrl)) ||
    (isExternal && ['news', 'sports', 'streaming'].includes(String(item.category || '')));
  const playbackLabel = item.streamUrl ? 'Player interno' : isExternal ? 'Vista web' : 'Catálogo';

  return (
    <button
      type="button"
      onClick={() => onPlay(item)}
      className="group relative text-left focus:outline-none"
      style={width ? { width: `${width}px` } : undefined}
    >
      <div
        className={`relative ${layoutClasses[layout]} overflow-hidden rounded-2xl border border-white/5 bg-surface shadow-2xl transition-all duration-300 group-hover:border-accent group-focus-visible:border-accent group-focus-visible:ring-4 group-focus-visible:ring-accent/60 group-hover:scale-[1.04] group-focus-visible:scale-[1.04]`}
      >
        <img
          src={
            item.thumbnailUrl ||
            `https://picsum.photos/seed/${encodeURIComponent(item.name || item.id)}/600/400`
          }
          alt={item.name}
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent" />

        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {badge && (
              <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-accent text-bg shadow-lg">
                {badge}
              </span>
            )}
            {isLive && (
              <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-danger/90 text-white shadow-lg flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
              </span>
            )}
            {isExternal && (
              <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/15 text-white border border-white/20 backdrop-blur-md flex items-center gap-1">
                <ExternalLink size={10} /> Web
              </span>
            )}
            {item.tierRequired && item.tierRequired !== 'free' && (
              <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/15 text-white border border-white/20 backdrop-blur-md">
                {item.tierRequired}
              </span>
            )}
          </div>
          {canDelete && onDelete && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item);
              }}
              className="w-8 h-8 rounded-full bg-danger/80 text-white flex items-center justify-center hover:bg-danger transition-colors"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </span>
          )}
        </div>

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
          <div className="w-14 h-14 bg-white text-bg rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 group-focus-visible:scale-100 transition-transform">
            <Play size={26} fill="currentColor" />
          </div>
        </div>

        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate rounded-full bg-black/55 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white/75 backdrop-blur">
            {categoryLabel(item.category)}
          </span>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-black/55 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white/75 backdrop-blur">
            {item.streamUrl ? <Radio size={10} /> : <ShieldCheck size={10} />}
            {playbackLabel}
          </span>
        </div>

        {showProgress && (
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/15">
            <div
              className="h-full bg-accent shadow-[0_0_12px_rgba(0,240,255,0.7)]"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>
      <div className="px-1 pt-3">
        <h3 className="text-white font-black text-[13px] uppercase tracking-tighter truncate leading-tight group-hover:text-accent group-focus-visible:text-accent transition-colors">
          {item.name}
        </h3>
        {item.description ? (
          <p className="text-text-dim text-[10px] font-bold tracking-wide line-clamp-2 mt-1 opacity-75 leading-snug">
            {item.description}
          </p>
        ) : null}
      </div>
    </button>
  );
};
