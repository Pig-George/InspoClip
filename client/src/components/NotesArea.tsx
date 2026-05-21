import { useRef, useCallback } from 'react';
import { useLanguage } from '@/context/LanguageContext';

const LINE_HEIGHT = 28;

interface NotesAreaProps {
  content: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  height: number;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  resizeRef: React.Ref<HTMLDivElement>;
}

export function NotesArea({
  content,
  onChange,
  onBlur,
  height,
  onResizeMouseDown,
  resizeRef,
}: NotesAreaProps) {
  const { t } = useLanguage();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleScroll = useCallback(() => {
    if (!textareaRef.current) return;
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      const snapped = Math.round(el.scrollTop / LINE_HEIGHT) * LINE_HEIGHT;
      el.scrollTop = snapped;
    }, 100);
  }, []);

  return (
    <div className="sticky-note rounded-sm border border-[var(--card-border)] overflow-hidden relative">
      {/* Washi tape decoration */}
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 w-20 h-5 washi-tape washi-tape--red"
        style={{ transform: 'translateX(-50%) rotate(-2deg)' }}
      />

      {/* Header */}
      <div className="px-4 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-heading font-semibold text-[var(--ink)]">
            {t('Notes')}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] opacity-50">—</span>
        </div>
      </div>

      {/* Textarea */}
      <div style={{ height: `${height}px` }} className="mx-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onScroll={handleScroll}
          placeholder={t('NotesPlaceholder')}
          className="w-full h-full resize-none bg-transparent text-[var(--ink)]
            placeholder:text-[var(--text-muted)] focus:outline-none font-handwriting
            text-lg leading-relaxed"
          style={{
            lineHeight: `${LINE_HEIGHT}px`,
            background: `repeating-linear-gradient(0deg, transparent, transparent ${LINE_HEIGHT - 1}px, rgba(180,150,120,0.08) ${LINE_HEIGHT - 1}px, rgba(180,150,120,0.08) ${LINE_HEIGHT}px)`,
            backgroundPosition: `0 -7px`,
          }}
        />
      </div>

      {/* Resize handle */}
      <div
        ref={resizeRef}
        onMouseDown={onResizeMouseDown}
        className="h-2 cursor-row-resize bg-[var(--muted)]/60 hover:bg-[var(--accent)]/30 transition-colors flex items-center justify-center"
      >
        <div className="w-10 h-0.5 rounded-full bg-[var(--card-border)]" />
      </div>
    </div>
  );
}
