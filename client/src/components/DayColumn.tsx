import { DayName, Image as ImageType, ViewMode } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { ImageUploader } from './ImageUploader';
import { ImageCard } from './ImageCard';

interface DayColumnProps {
  dayName: DayName;
  dayOfWeek: number;
  weekId: string;
  images: ImageType[];
  viewMode: ViewMode;
  isToday: boolean;
  dateStr?: string;
  canUpload?: boolean;
  animDelay?: number;
  onRefresh: () => void;
}

export function DayColumn({ dayName, dayOfWeek, weekId, images, viewMode, isToday, dateStr, canUpload = true, animDelay = 0, onRefresh }: DayColumnProps) {
  const { t, locale } = useLanguage();

  const dateLabel = dateStr
    ? locale === 'zh'
      ? `${parseInt(dateStr.split('-')[1])}月${parseInt(dateStr.split('-')[2])}日`
      : new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const maxH = viewMode === 'day' ? 'calc(100vh - 250px)' : 'calc(100vh - 280px)';

  return (
    <div
      data-day-column
      className={`flex-shrink-0 flex flex-col rounded-sm border-2
        ${viewMode === 'day' ? 'w-[340px] snap-start' : 'w-[260px]'}
        ${isToday
          ? 'border-[var(--accent)] shadow-lg shadow-[var(--accent)]/25'
          : 'border-[var(--card-border)] shadow-md'}
      `}
      style={{
        maxHeight: maxH,
        overflowY: 'auto',
        overflowX: 'hidden',
        background: `
          linear-gradient(180deg, rgba(210,180,140,0.08) 0%, transparent 30%, transparent 70%, rgba(210,180,140,0.06) 100%)
        `,
        backgroundColor: 'var(--card)',
      }}
    >
      {/* Sticky header — handcrafted label feel */}
      <div
        className={`sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b
          bg-[var(--card)] ${isToday ? 'border-[var(--accent)]/40' : 'border-[var(--card-border)]'}`}
        style={{
          borderBottomStyle: 'dashed',
        }}
      >
        <div className="flex flex-col">
          <h3 className={`text-lg font-heading font-semibold flex items-center gap-2
            ${isToday ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}
          >
            {t(dayName)}
            {isToday && (
              <span className="text-[10px] font-heading bg-[var(--accent)] text-white px-1.5 py-0.5 rounded-full leading-none">
                {locale === 'zh' ? '今天' : 'Today'}
              </span>
            )}
          </h3>
          {dateLabel && (
            <span className="text-xs text-[var(--text-muted)] font-handwriting">{dateLabel}</span>
          )}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-handwriting min-w-[22px] text-center
          ${isToday
            ? 'bg-[var(--accent)] text-white'
            : 'bg-[var(--accent)]/15 text-[var(--accent)]'}`}
        >
          {images.length}
        </span>
      </div>

      {/* Content area — NO overflow (scroll is on outer div, tooltips overflow freely) */}
      <div className="flex-1 px-4 py-3 space-y-3">
        {images.map((image) => (
          <ImageCard key={image.id} image={image} onRefresh={onRefresh} animDelay={animDelay} />
        ))}

        {images.length === 0 && (
          <div className="flex items-center justify-center h-24 text-[var(--text-muted)] text-sm font-handwriting opacity-30">
            {canUpload ? t('PasteOrDrop') : t('EmptyPage')}
          </div>
        )}
      </div>

      {/* Sticky footer — only today can upload */}
      <div className="sticky bottom-0 z-10 px-4 py-3 border-t border-[var(--card-border)] bg-[var(--card)]">
        {canUpload ? (
          <ImageUploader weekId={weekId} dayOfWeek={dayOfWeek} onUploaded={onRefresh} />
        ) : (
          <p className="text-[11px] text-[var(--text-muted)] text-center font-handwriting opacity-40">
            {locale === 'zh' ? '仅今日可上传' : 'Upload only today'}
          </p>
        )}
      </div>
    </div>
  );
}
