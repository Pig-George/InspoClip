import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { DayColumn } from './DayColumn';
import { NotesArea } from './NotesArea';
import { ALL_DAYS, type WeekData, getTodayIndex } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { fetchWeek, saveNotes } from '@/lib/api';
import { getMonday, formatISODate } from '@/lib/utils';

const COL_WIDTH = 340;
const COL_GAP = 16;
const COL_STEP = COL_WIDTH + COL_GAP;
const WEEK_DAYS = 7;
const WEEK_SCROLL = WEEK_DAYS * COL_STEP;
const SCROLL_THRESHOLD = COL_STEP * 2;
const LINE_STEP = 28;
const NOTES_MIN_H = 84;
const NOTES_MAX_H = 420;

interface DayViewProps {
  initialMonday: Date;
  onRefresh: () => void;
}

export function DayView({ initialMonday, onRefresh }: DayViewProps) {
  const { t, locale } = useLanguage();
  const [notesContent, setNotesContent] = useState('');
  const [notesHeight, setNotesHeight] = useState(140);
  const [notesOpen, setNotesOpen] = useState(true);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [weekDataMap, setWeekDataMap] = useState<Map<string, WeekData>>(new Map());
  const [weekMondays, setWeekMondays] = useState<string[]>([]);
  const [hideEmpty, setHideEmpty] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const noMorePreviousRef = useRef(false);
  const noMoreNextRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const resizing = useRef(false);
  const scrollAdjustRef = useRef(0);
  const initialLoadedRef = useRef(false);

  // Build flat day entries from all loaded weeks
  const dayEntries = useMemo(() => {
    const entries: {
      date: Date;
      isoDate: string;
      dayOfWeek: number;
      dayName: typeof ALL_DAYS[number]['dayName'];
      weekId: string;
      images: import('@/types').Image[];
      isToday: boolean;
      canUpload: boolean;
    }[] = [];

    const todayIso = formatISODate(new Date());

    for (const mondayStr of weekMondays) {
      const data = weekDataMap.get(mondayStr);
      if (!data) continue;
      const monday = new Date(mondayStr + 'T00:00:00');
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const isoDate = formatISODate(date);
        // Skip future days
        if (isoDate > todayIso) continue;
        entries.push({
          date,
          isoDate,
          dayOfWeek: i,
          dayName: ALL_DAYS[i].dayName,
          weekId: data.week.id,
          images: data.images.filter((img) => img.dayOfWeek === i),
          isToday: isoDate === todayIso,
          canUpload: isoDate === todayIso,
        });
      }
    }
    return entries;
  }, [weekMondays, weekDataMap]);

  // Load a week by its Monday date, with direction for scroll adjustment
  const loadWeek = useCallback(async (mondayStr: string, prepend: boolean, contentOnly = false) => {
    try {
      const data = await fetchWeek(mondayStr, contentOnly);

      // In contentOnly mode, skip weeks with no images
      if (contentOnly && data.week === null) {
        return null;
      }

      setWeekDataMap((prev) => {
        const next = new Map(prev);
        next.set(mondayStr, data);
        return next;
      });
      if (prepend) {
        scrollAdjustRef.current += WEEK_SCROLL;
      }
      return data;
    } catch (err) {
      console.error('Failed to load week:', mondayStr, err);
      return null;
    }
  }, []);

  // Initialize: load current week + previous week + next week (if not in the future)
  useEffect(() => {
    if (initialLoadedRef.current) return;
    initialLoadedRef.current = true;

    const initMonday = formatISODate(getMonday(initialMonday));
    const todayMonday = formatISODate(getMonday(new Date()));

    // Previous week
    const prevDate = new Date(initialMonday);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevMondayStr = formatISODate(getMonday(prevDate));

    // Next week (only if not beyond current week)
    const nextDate = new Date(initialMonday);
    nextDate.setDate(nextDate.getDate() + 7);
    const nextMondayStr = formatISODate(getMonday(nextDate));
    const hasNext = nextMondayStr <= todayMonday;

    const mondays = [prevMondayStr, initMonday];
    if (hasNext) mondays.push(nextMondayStr);
    setWeekMondays(mondays);

    const promises = [loadWeek(prevMondayStr, true), loadWeek(initMonday, false)];
    if (hasNext) promises.push(loadWeek(nextMondayStr, false));

    Promise.all(promises).then(() => {
      const todayIso = formatISODate(new Date());
      // Find today's index (it's in the current week, which is at position 7 in the flat list)
      const monday = new Date(initMonday + 'T00:00:00');
      let todayIdx = 7; // starts at first day of initMonday (index 7 after prev week)
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        if (formatISODate(d) === todayIso) {
          todayIdx = 7 + i;
          break;
        }
      }
      setActiveDayIndex(todayIdx);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollLeft = todayIdx * COL_STEP - COL_STEP;
        }
      }, 100);
    });
  }, [initialMonday, loadWeek]);

  // Adjust scroll after prepending weeks (useLayoutEffect to avoid visible jump)
  useLayoutEffect(() => {
    if (scrollAdjustRef.current && scrollRef.current) {
      scrollRef.current.scrollLeft += scrollAdjustRef.current;
      scrollAdjustRef.current = 0;
    }
  }, [weekMondays]);

  // Auto-scroll dots container to keep active dot visible (only if needed)
  useEffect(() => {
    const container = dotsRef.current;
    if (!container) return;
    // Find the dot matching the active date
    const activeEntry = dayEntries[activeDayIndex];
    if (!activeEntry) return;
    const dot = container.querySelector(`[data-date-dot="${activeEntry.isoDate}"]`) as HTMLElement | null;
    if (!dot) return;
    // Only scroll if dot is not fully visible
    const cRect = container.getBoundingClientRect();
    const dRect = dot.getBoundingClientRect();
    if (dRect.left < cRect.left || dRect.right > cRect.right) {
      dot.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeDayIndex, dayEntries]);

  // Native wheel → horizontal scroll (vertical if inside a day column's content)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // If over a scrollable day column, let it scroll vertically
      const target = e.target as HTMLElement;
      const column = target.closest('[data-day-column]') as HTMLElement | null;
      if (column && column.scrollHeight > column.clientHeight) return;
      // Otherwise scroll horizontally
      e.preventDefault();
      el.scrollBy({ left: e.deltaY, behavior: 'instant' });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Dots navigation — wheel → horizontal scroll
  useEffect(() => {
    const el = dotsRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollBy({ left: e.deltaY, behavior: 'instant' });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Load previous week when scrolling near left edge
  const loadPreviousWeek = useCallback(async () => {
    if (loadingMore || weekMondays.length === 0 || noMorePreviousRef.current) return;

    // Don't load more if content fits within viewport
    const el = scrollRef.current;
    if (el && el.scrollWidth <= el.clientWidth + 10) return;

    const firstMonday = weekMondays[0];
    const prevDate = new Date(firstMonday + 'T00:00:00');
    prevDate.setDate(prevDate.getDate() - 7);
    const prevMonday = formatISODate(prevDate);

    if (!weekDataMap.has(prevMonday)) {
      setLoadingMore(true);
      const data = await loadWeek(prevMonday, true, hideEmpty);
      if (data) {
        setWeekMondays((prev) => [prevMonday, ...prev]);
        setActiveDayIndex((prev) => prev + 7);
      } else if (hideEmpty) {
        noMorePreviousRef.current = true;
      }
      setLoadingMore(false);
    }
  }, [loadingMore, weekMondays, weekDataMap, loadWeek, hideEmpty]);

  // Load next week when scrolling near right edge (only if not in the future)
  const loadNextWeek = useCallback(async () => {
    if (loadingMore || weekMondays.length === 0 || noMoreNextRef.current) return;

    // Don't load more if content fits within viewport
    const el = scrollRef.current;
    if (el && el.scrollWidth <= el.clientWidth + 10) return;

    const lastMonday = weekMondays[weekMondays.length - 1];
    const nextDate = new Date(lastMonday + 'T00:00:00');
    nextDate.setDate(nextDate.getDate() + 7);
    const nextMonday = formatISODate(nextDate);

    // Don't load weeks beyond the current week
    const todayMonday = formatISODate(getMonday(new Date()));
    if (nextMonday > todayMonday) return;

    if (!weekDataMap.has(nextMonday)) {
      setLoadingMore(true);
      const data = await loadWeek(nextMonday, false, hideEmpty);
      if (data) {
        setWeekMondays((prev) => [...prev, nextMonday]);
      } else if (hideEmpty) {
        noMoreNextRef.current = true;
      }
      setLoadingMore(false);
    }
  }, [loadingMore, weekMondays, weekDataMap, loadWeek, hideEmpty]);

  // Scroll handler: detect edges for infinite loading + track active day
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEdgeLoadRef = useRef(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;

    // Only trigger edge loading if there's meaningful scrollable content
    // and we're actually near the edge (not just slightly past the start)
    const now = Date.now();
    const canLoad = now - lastEdgeLoadRef.current > 500; // throttle edge loads

    if (canLoad && scrollLeft < COL_STEP && scrollLeft < maxScroll * 0.3) {
      lastEdgeLoadRef.current = now;
      loadPreviousWeek();
    }
    if (canLoad && maxScroll > 0 && scrollLeft > maxScroll - COL_STEP && scrollLeft > maxScroll * 0.7) {
      lastEdgeLoadRef.current = now;
      loadNextWeek();
    }

    // Debounce active day update to avoid jitter during fast scrolling
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      const centerX = scrollLeft + clientWidth / 2;
      let closestIdx = activeDayIndex;
      let closestDist = Infinity;
      for (let i = 0; i < dayEntries.length; i++) {
        const entry = dayEntries[i];
        if (hideEmpty && !entry.isToday && entry.images.length === 0) continue;
        const child = el.querySelector(`[data-date="${entry.isoDate}"]`) as HTMLElement | null;
        if (!child) continue;
        const dist = Math.abs(child.offsetLeft + child.offsetWidth / 2 - centerX);
        if (dist < closestDist) { closestDist = dist; closestIdx = i; }
      }
      if (closestIdx !== activeDayIndex) setActiveDayIndex(closestIdx);
    }, 80);
  }, [loadPreviousWeek, loadNextWeek, activeDayIndex, dayEntries, hideEmpty]);

  // Navigate to a specific day entry
  const scrollToDay = useCallback((index: number) => {
    if (scrollRef.current && index >= 0 && index < dayEntries.length) {
      scrollRef.current.scrollTo({ left: index * COL_STEP - COL_STEP, behavior: 'smooth' });
      setActiveDayIndex(index);
    }
  }, [dayEntries.length]);

  // Refresh all loaded weeks after delete or upload
  const handleRefresh = useCallback(async () => {
    const promises = weekMondays.map((m) => fetchWeek(m));
    const results = await Promise.all(promises);
    setWeekDataMap((prev) => {
      const next = new Map(prev);
      weekMondays.forEach((m, i) => {
        if (results[i]) next.set(m, results[i]);
      });
      return next;
    });
  }, [weekMondays]);

  // Notes
  const activeWeekId = dayEntries[activeDayIndex]?.weekId;
  useEffect(() => {
    if (activeWeekId && weekDataMap) {
      for (const [, data] of weekDataMap) {
        if (data.week.id === activeWeekId) {
          setNotesContent(data.notes?.content || '');
          break;
        }
      }
    }
  }, [activeWeekId, weekDataMap]);

  const handleNotesBlur = useCallback(() => {
    if (activeWeekId) {
      saveNotes(activeWeekId, notesContent);
    }
  }, [activeWeekId, notesContent]);

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
      setNotesHeight(Math.max(NOTES_MIN_H, Math.min(NOTES_MAX_H, snapped)));
    };

    const onMouseUp = () => {
      resizing.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Filtered entries (hide empty days when enabled, always keep today)
  const visibleEntries = useMemo(() => {
    if (!hideEmpty) return dayEntries;
    return dayEntries.filter((e) => e.isToday || e.images.length > 0);
  }, [dayEntries, hideEmpty]);

  // Map active day index to visible index
  const visibleIndex = useMemo(() => {
    const entry = dayEntries[activeDayIndex];
    if (!entry) return 0;
    return visibleEntries.findIndex((e) => e.isoDate === entry.isoDate);
  }, [dayEntries, visibleEntries, activeDayIndex]);

  // Scroll to visible day
  const scrollToVisibleDay = useCallback(
    (vi: number) => {
      const entry = visibleEntries[vi];
      if (!entry || !scrollRef.current) return;
      const el = scrollRef.current.querySelector(`[data-date="${entry.isoDate}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
      const fullIdx = dayEntries.findIndex((e) => e.isoDate === entry.isoDate);
      if (fullIdx >= 0) setActiveDayIndex(fullIdx);
    },
    [dayEntries, visibleEntries],
  );

  const goToToday = useCallback(() => {
    const todayIso = formatISODate(new Date());
    const idx = dayEntries.findIndex((e) => e.isoDate === todayIso);
    if (idx >= 0) {
      setActiveDayIndex(idx);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ left: idx * COL_STEP - COL_STEP, behavior: 'smooth' });
        }
      }, 50);
    }
  }, [dayEntries]);

  // Format visible date range
  const visibleRange = useMemo(() => {
    if (dayEntries.length === 0) return '';
    const first = dayEntries[0]?.date;
    const last = dayEntries[dayEntries.length - 1]?.date;
    if (!first || !last) return '';
    const loc = 'zh-CN';
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${first.toLocaleDateString(loc, opts)} - ${last.toLocaleDateString(loc, opts)}`;
  }, [dayEntries]);

  return (
    <div className="flex flex-col gap-3">
      {/* Day navigation — scrapbook date strip */}
      <div className="flex items-center gap-3 px-2 py-2 rounded-sm"
        style={{
          background: 'linear-gradient(180deg, var(--tape) 0%, rgba(232,213,176,0.3) 100%)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.4)',
        }}
      >
        {/* Left: arrows + today + filter toggle */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => scrollToVisibleDay(visibleIndex - 1)}
            disabled={visibleIndex <= 0}
            className="p-1 hover:opacity-70 transition-opacity disabled:opacity-20"
          >
            <ChevronLeft className="w-4 h-4 text-[var(--ink)]" />
          </button>
          <button
            onClick={goToToday}
            className="px-2 py-0.5 text-[11px] font-heading rounded-sm text-[var(--ink)]/80
              border border-[var(--card-border)] bg-[var(--card)]/50 hover:bg-[var(--card)] transition-colors"
          >
            {locale === 'zh' ? '今天' : 'Today'}
          </button>
          <button
            onClick={() => scrollToVisibleDay(visibleIndex + 1)}
            disabled={visibleIndex >= visibleEntries.length - 1}
            className="p-1 hover:opacity-70 transition-opacity disabled:opacity-20"
          >
            <ChevronRight className="w-4 h-4 text-[var(--ink)]" />
          </button>
          {/* Filter toggle */}
          <button
            onClick={() => {
              noMorePreviousRef.current = false;
              noMoreNextRef.current = false;
              setHideEmpty(!hideEmpty);
            }}
            className={`ml-1 px-1.5 py-0.5 text-[10px] font-heading rounded-sm border transition-colors
              ${hideEmpty
                ? 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30'
                : 'text-[var(--text-muted)] border-[var(--card-border)]/50'}`}
            title={hideEmpty ? '显示全部' : '隐藏空白'}
          >
            {hideEmpty ? (locale === 'zh' ? '灵感' : 'Ideas') : (locale === 'zh' ? '全部' : 'All')}
          </button>
        </div>

        {/* Center: active day */}
        <div className="flex-1 text-center min-w-0">
          <span className="text-sm font-handwriting text-[var(--ink)] whitespace-nowrap">
            {visibleEntries[visibleIndex]
              ? `${visibleEntries[visibleIndex].date.getMonth() + 1}月${visibleEntries[visibleIndex].date.getDate()}日 ${t(visibleEntries[visibleIndex].dayName)}`
              : ''
            }
          </span>
        </div>

        {/* Right: date strip — filtered dots */}
        <div ref={dotsRef} className="flex gap-0.5 max-w-[220px] overflow-x-auto flex-shrink-0 py-0.5 dots-scroll">
          {visibleEntries.map((entry, i) => {
            const isActive = i === visibleIndex;
            const isToday = entry.isToday;
            return (
              <button
                key={entry.isoDate}
                data-date-dot={entry.isoDate}
                onClick={() => scrollToVisibleDay(i)}
                className={`flex-shrink-0 w-7 h-7 flex items-center justify-center text-[10px] font-handwriting
                  transition-all rounded-sm border
                  ${isActive
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-sm scale-110'
                    : isToday
                      ? 'bg-[var(--card)] text-[var(--accent)] border-[var(--accent)]/40 shadow-sm'
                      : 'bg-[var(--card)]/50 text-[var(--text-muted)] border-[var(--card-border)]/50 hover:bg-[var(--card)]'
                  }`}
                style={isActive ? {
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  transform: 'scale(1.15)',
                  fontWeight: 'bold',
                } : isToday ? {
                  borderStyle: 'dashed',
                } : undefined}
              >
                {entry.date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Horizontal scroll — plain div for stable ref, wheel listener attached via useEffect */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto pb-2"
        style={{
          scrollSnapType: visibleEntries.length > 3 ? 'x proximity' : 'none',
          overscrollBehaviorX: 'contain',
          willChange: 'scroll-position',
        }}
      >
        {dayEntries.map((entry, i) => {
          if (hideEmpty && !entry.isToday && entry.images.length === 0) return null;
          return (
            <motion.div
              key={entry.isoDate}
              data-date={entry.isoDate}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.3 + ((entry.isoDate.charCodeAt(8) + entry.isoDate.charCodeAt(9)) % 10) * 0.04,
                delay: Math.min(i, 8) * 0.06,
              }}
              style={{ willChange: 'opacity' }}
            >
              <DayColumn
                dayName={entry.dayName}
                dayOfWeek={entry.dayOfWeek}
                weekId={entry.weekId}
                images={entry.images}
                viewMode="day"
                isToday={entry.isToday}
                dateStr={entry.isoDate}
                canUpload={entry.canUpload}
                animDelay={Math.min(i, 8) * 0.06 + 0.3}
                onRefresh={handleRefresh}
              />
            </motion.div>
          );
        })}

        {/* Loading indicator */}
        {loadingMore && (
          <div className="flex-shrink-0 w-[340px] flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
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
