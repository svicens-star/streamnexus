import React, { useEffect, useRef } from 'react';
import { Delete, Space, X } from 'lucide-react';

interface OnScreenKeyboardProps {
  value: string;
  onChange: (next: string) => void;
  onClose?: () => void;
}

const KEY_ROWS: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '-', '.', '_'],
];

export const OnScreenKeyboard: React.FC<OnScreenKeyboardProps> = ({
  value,
  onChange,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const first = containerRef.current?.querySelector<HTMLButtonElement>('[data-osk-key]');
    first?.focus();
  }, []);

  const handleKey = (k: string) => {
    if (k === '__SPACE__') {
      onChange(value + ' ');
      return;
    }
    if (k === '__DEL__') {
      onChange(value.slice(0, -1));
      return;
    }
    if (k === '__CLEAR__') {
      onChange('');
      return;
    }
    onChange(value + k.toLowerCase());
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const root = containerRef.current;
    if (!root) return;
    const focused = document.activeElement as HTMLElement | null;
    if (!focused || !root.contains(focused)) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;

    const all = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-osk-key]'));
    const idx = all.indexOf(focused as HTMLButtonElement);
    if (idx < 0) return;
    e.preventDefault();

    const cols = 10;
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    let nextRow = row;
    let nextCol = col;
    if (e.key === 'ArrowLeft') nextCol = col - 1;
    if (e.key === 'ArrowRight') nextCol = col + 1;
    if (e.key === 'ArrowUp') nextRow = row - 1;
    if (e.key === 'ArrowDown') nextRow = row + 1;
    nextRow = Math.max(0, Math.min(nextRow, Math.ceil(all.length / cols) - 1));
    nextCol = Math.max(0, Math.min(nextCol, cols - 1));
    const target = (all[nextRow * cols + nextCol] || all[Math.min(all.length - 1, nextRow * cols)]) as HTMLButtonElement | undefined;
    target?.focus();
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={onKeyDown}
      className="bg-surface/95 backdrop-blur-xl border border-white/10 rounded-3xl p-4 lg:p-6 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-3 px-2">
        <span className="text-[11px] font-black text-text-dim uppercase tracking-widest">
          Teclado para mando
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-text-dim hover:text-white p-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Cerrar teclado"
          >
            <X size={18} />
          </button>
        )}
      </div>
      <div className="grid gap-2">
        {KEY_ROWS.map((row, ri) => (
          <div key={ri} className="grid grid-cols-10 gap-2">
            {row.map((k) => (
              <button
                key={k}
                type="button"
                data-osk-key
                onClick={() => handleKey(k)}
                className="h-12 lg:h-14 rounded-xl bg-surface-light text-white font-black text-base hover:bg-accent hover:text-bg focus:outline-none focus-visible:bg-accent focus-visible:text-bg focus-visible:ring-2 focus-visible:ring-accent transition-all"
              >
                {k}
              </button>
            ))}
          </div>
        ))}
        <div className="grid grid-cols-10 gap-2 mt-1">
          <button
            type="button"
            data-osk-key
            onClick={() => handleKey('__SPACE__')}
            className="col-span-5 h-12 lg:h-14 rounded-xl bg-surface-light text-white font-black hover:bg-accent hover:text-bg focus:outline-none focus-visible:bg-accent focus-visible:text-bg focus-visible:ring-2 focus-visible:ring-accent transition-all flex items-center justify-center gap-2"
          >
            <Space size={18} /> Espacio
          </button>
          <button
            type="button"
            data-osk-key
            onClick={() => handleKey('__DEL__')}
            className="col-span-3 h-12 lg:h-14 rounded-xl bg-surface-light text-white font-black hover:bg-danger hover:text-white focus:outline-none focus-visible:bg-danger focus-visible:text-white focus-visible:ring-2 focus-visible:ring-danger transition-all flex items-center justify-center gap-2"
          >
            <Delete size={18} /> Borrar
          </button>
          <button
            type="button"
            data-osk-key
            onClick={() => handleKey('__CLEAR__')}
            className="col-span-2 h-12 lg:h-14 rounded-xl bg-surface-light text-white font-black hover:bg-white/10 focus:outline-none focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-accent transition-all"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
};
