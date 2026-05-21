import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DayColumn } from './DayColumn';
import { NotesArea } from './NotesArea';
import { ALL_DAYS, type WeekData } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { saveNotes } from '@/lib/api';
import { formatISODate } from '@/lib/utils';

const LINE_STEP = 28;
const MIN_H = 84;  // 3 lines
const MAX_H = 420; // 15 lines

interface WeekViewProps {
  weekData: WeekData | null;
  onRefresh: () => void;
}

export function WeekView({ weekData, onRefresh }: WeekViewProps) {
  const { t } = useLanguage();
  const [notesContent, setNotesContent] = useState(weekData?.notes?.content || '');
  const [notesHeight, setNotesHeight] = useState(140);
  const [notesOpen, setNotesOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const resizing = useRef(false);

  // Keep notes in sync when week changes
  const prevWeekId = useRef(weekData?.week?.id);
  if (weekData?.week?.id !== prevWeekId.current) {
    prevWeekId.current = weekData?.week?.id;
    setNotesContent(weekData?.notes?.content || '');
  }

  const handleNotesBlur = useCallback(() => {
    if (weekData?.week?.id) {
      saveNotes(weekData.week.id, notesContent);
    }
  }, [weekData, notesContent]);

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    const startY = e.clientY;
    const startHeight = notesHeight;

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      const delta = ev.clientY - startY;
      const raw = startHeight + delta;
      const snapped = Math.round(raw / LINE_STEP) * LINE_STEP;
      setNotesHeight(Math.max(MIN_H, Math.min(MAX_H, snapped)));
    };

    const onMouseUp = () => {
      resizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const getImagesForDay = (dayOfWeek: number) => {
    if (!weekData) return [];
    return weekData.images.filter((img) => img.dayOfWeek === dayOfWeek);
  };

  const todayIso = formatISODate(new Date());

  // Wheel → horizontal scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      const column = target.closest('[data-day-column]') as HTMLElement | null;
      if (column && column.scrollHeight > column.clientHeight) return;
      e.preventDefault();
      el.scrollBy({ left: e.deltaY, behavior: 'instant' });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* 7 columns side by side */}
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2">
        {ALL_DAYS.map(({ dayOfWeek, dayName }, i) => {
          const weekMonday = weekData?.week?.weekStart;
          let dateStr: string | undefined;
          let isFuture = false;
          if (weekMonday) {
            const d = new Date(weekMonday + 'T00:00:00');
            d.setDate(d.getDate() + dayOfWeek);
            dateStr = formatISODate(d);
            isFuture = dateStr > todayIso;
          }

          // Skip future days
          if (isFuture) return null;

          return (
            <motion.div
              key={dayName}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <DayColumn
                dayName={dayName}
                dayOfWeek={dayOfWeek}
                weekId={weekData?.week?.id || ''}
                images={getImagesForDay(dayOfWeek)}
                viewMode="week"
                isToday={dateStr === todayIso}
                dateStr={dateStr}
                canUpload={dateStr === todayIso}
                onRefresh={onRefresh}
              />
            </motion.div>
          );
        })}
      </div>

      {/* Notes (collapsible) */}
      <div className="relative">
        <button
          onClick={() => setNotesOpen(!notesOpen)}
          className="flex items-center gap-1 text-xs font-heading text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-1"
        >
          {notesOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          {t('Notes')}
        </button>
        {notesOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <NotesArea
              content={notesContent}
              onChange={setNotesContent}
              onBlur={handleNotesBlur}
              height={notesHeight}
              onResizeMouseDown={handleResizeMouseDown}
              resizeRef={resizeRef}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
