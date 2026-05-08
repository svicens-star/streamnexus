import React, { useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import { MediaCard, type MediaCardItem, type MediaCardLayout } from './MediaCard';
import type { ProgressRecord } from '../lib/progress';

interface MediaRowProps {
  title: string;
  subtitle?: string;
  items: MediaCardItem[];
  layout?: MediaCardLayout;
  cardWidth?: number;
  progressByItemId?: Record<string, ProgressRecord>;
  onPlay: (item: MediaCardItem) => void;
  emptyText?: string;
  onSeeAll?: () => void;
  highlightColor?: string;
}

export const MediaRow: React.FC<MediaRowProps> = ({
  title,
  subtitle,
  items,
  layout = 'landscape',
  cardWidth,
  progressByItemId,
  onPlay,
  emptyText,
  onSeeAll,
  highlightColor,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const focused = document.activeElement as HTMLElement | null;
      if (!focused || !el.contains(focused)) return;
      const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-row-card]'));
      const idx = cards.indexOf(focused.closest('[data-row-card]') as HTMLElement);
      if (idx < 0) return;
      e.preventDefault();
      const nextIdx = e.key === 'ArrowRight' ? idx + 1 : idx - 1;
      if (nextIdx < 0 || nextIdx >= cards.length) return;
      const target = cards[nextIdx] as HTMLElement;
      const button = target.querySelector('button') as HTMLElement | null;
      (button || target).focus();
      target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [items]);

  const defaultWidth = layout === 'poster' ? 200 : layout === 'square' ? 240 : 320;
  const width = cardWidth ?? defaultWidth;

  return (
    <section className="px-4 sm:px-6 lg:px-10 py-5">
      <div className="flex items-end justify-between mb-5">
        <div>
          <div className="flex items-center gap-3">
            {highlightColor && (
              <span
                className="w-2 h-7 rounded-full"
                style={{ backgroundColor: highlightColor }}
              />
            )}
            <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tighter">
              {title}
            </h2>
          </div>
          {subtitle && (
            <p className="text-text-dim text-xs uppercase tracking-widest font-bold mt-1.5 opacity-60">
              {subtitle}
            </p>
          )}
        </div>
        {onSeeAll && items.length > 0 && (
          <button
            onClick={onSeeAll}
            className="text-[11px] font-black text-accent uppercase tracking-widest hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md px-2 py-1 flex items-center gap-1"
          >
            Ver todo <ChevronRight size={14} />
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-text-dim text-sm py-8 italic opacity-50">
          {emptyText || 'Sin contenido todavía.'}
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 lg:gap-5 overflow-x-auto pb-4 scrollbar-hide snap-x"
        >
          {items.map((item) => (
            <div
              key={item.id}
              data-row-card
              className="flex-shrink-0 snap-start"
              style={{ width: `${width}px` }}
            >
              <MediaCard
                item={item}
                layout={layout}
                progress={progressByItemId?.[item.id]}
                onPlay={onPlay}
                width={width}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
