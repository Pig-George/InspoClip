import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { DayColumn } from './DayColumn';
import { NotesArea } from './NotesArea';
import { ALL_DAYS, type WeekData, getTodayIndex } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { fetchContentWeeks, fetchWeek, saveNotes } from '@/lib/api';
import { getMonday, formatISODate } from '@/lib/utils';
import { WorkspaceCollapsiblePanel, WorkspaceDateBar, WorkspaceDayScroller } from '@inspoclip/workspace-ui';

const COL_WIDTH = 340;
const COL_GAP = 16;
const COL_STEP = COL_WIDTH + COL_GAP;
const WEEK_DAYS = 7;
const WEEK_SCROLL = WEEK_DAYS * COL_STEP;
const SCROLL_THRESHOLD = COL_STEP * 2;
const LINE_STEP = 28;
const NOTES_MIN_H = 84;
const NOTES_MAX_H = 420;
const CONTENT_WEEK_LIMIT = 8;

interface DayViewProps {
  initialMonday: Date;
  onRefresh: () => void;
  onOpenVideo: (videoId: string, jobId?: string) => void;
}

interface InitialDayScrollTargetInput {
  loadedMondays: string[];
  weekDataByMonday: Map<string, WeekData>;
  todayIso: string;
  initMonday: string;
  hideEmpty: boolean;
}

interface InitialDayScrollTarget {
  index: number;
  isoDate: string;
}

function addDaysIso(mondayStr: string, dayOffset: number) {
  const date = new Date(`${mondayStr}T00:00:00`);
  date.setDate(date.getDate() + dayOffset);
  return formatISODate(date);
}

function getFallbackTodayTarget(loadedMondays: string[], initMonday: string, todayIso: string): InitialDayScrollTarget {
  const weekIndex = Math.max(0, loadedMondays.indexOf(initMonday));
  let dayOffset = 0;

  for (let i = 0; i < WEEK_DAYS; i++) {
    if (addDaysIso(initMonday, i) === todayIso) {
      dayOffset = i;
      break;
    }
  }

  return {
    index: weekIndex * WEEK_DAYS + dayOffset,
    isoDate: todayIso,
  };
}

function hasContentOnDay(data: WeekData, dayOfWeek: number) {
  return data.images.some((img) => img.dayOfWeek === dayOfWeek)
    || (data.videos ?? []).some((video) => video.dayOfWeek === dayOfWeek);
}

export function getDayContentScroller(target: HTMLElement): HTMLElement | null {
  return target.closest<HTMLElement>('.client-day-column-content')
}

export function canScrollDayContent(element: HTMLElement, deltaY: number): boolean {
  if (element.scrollHeight <= element.clientHeight) return false
  if (deltaY > 0) return element.scrollTop < element.scrollHeight - element.clientHeight - 1
  if (deltaY < 0) return element.scrollTop > 0
  return false
}

export function getInitialDayScrollTarget({
  loadedMondays,
  weekDataByMonday,
  todayIso,
  initMonday,
  hideEmpty,
}: InitialDayScrollTargetInput): InitialDayScrollTarget {
  const fallback = getFallbackTodayTarget(loadedMondays, initMonday, todayIso);
  if (!hideEmpty) return fallback;

  let latestContentTarget: InitialDayScrollTarget | null = null;

  loadedMondays.forEach((mondayStr, weekIndex) => {
    const data = weekDataByMonday.get(mondayStr);
    if (!data) return;

    for (let dayOfWeek = 0; dayOfWeek < WEEK_DAYS; dayOfWeek++) {
      const isoDate = addDaysIso(mondayStr, dayOfWeek);
      if (isoDate > todayIso) continue;
      if (!hasContentOnDay(data, dayOfWeek)) continue;

      latestContentTarget = {
        index: weekIndex * WEEK_DAYS + dayOfWeek,
        isoDate,
      };
    }
  });

  return latestContentTarget ?? fallback;
}

export function DayView({ initialMonday, onRefresh, onOpenVideo }: DayViewProps) {
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
  const furthestSearchedPrevRef = useRef<string | null>(null);
  const furthestSearchedNextRef = useRef<string | null>(null);
  const MIN_DATE = '2020-01-01'; // Don't search before this date
  const SEARCH_BATCH = 4; // Weeks to search per edge trigger
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
      videos: import('@/types/video').WeekVideo[];
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
          videos: (data.videos ?? []).filter((video) => video.dayOfWeek === i),
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

    const promises = [loadWeek(prevMondayStr, true, hideEmpty), loadWeek(initMonday, false, false)];
    if (hasNext) promises.push(loadWeek(nextMondayStr, false, hideEmpty));

    Promise.all(promises).then(async (initialResults) => {
      const weekDataByMonday = new Map<string, WeekData>();
      for (const data of initialResults) {
        if (data?.week) weekDataByMonday.set(data.week.weekStart, data);
      }

      let loadedMondays = hideEmpty
        ? Array.from(weekDataByMonday.keys()).sort()
        : [...mondays];

      if (hideEmpty) {
        const todayIso = formatISODate(new Date());
        const [previousContent, nextContent] = await Promise.all([
          fetchContentWeeks(todayIso, 'previous', CONTENT_WEEK_LIMIT).catch(() => ({ weeks: [] })),
          fetchContentWeeks(todayIso, 'next', CONTENT_WEEK_LIMIT).catch(() => ({ weeks: [] })),
        ]);
        const contentWeeks = [...previousContent.weeks, ...nextContent.weeks]
          .sort((a, b) => a.week.weekStart.localeCompare(b.week.weekStart));
        if (contentWeeks.length > 0) {
          loadedMondays = [...new Set([...loadedMondays, ...contentWeeks.map((data) => data.week.weekStart)])].sort();
          for (const data of contentWeeks) {
            weekDataByMonday.set(data.week.weekStart, data);
          }
          setWeekDataMap((prev) => {
            const next = new Map(prev);
            for (const data of contentWeeks) next.set(data.week.weekStart, data);
            return next;
          });
        }
        setWeekMondays(loadedMondays);
      }

      const todayIso = formatISODate(new Date());
      const target = getInitialDayScrollTarget({
        loadedMondays,
        weekDataByMonday,
        todayIso,
        initMonday,
        hideEmpty,
      });
      setActiveDayIndex(target.index);
      setTimeout(() => {
        if (scrollRef.current) {
          const targetEl = scrollRef.current.querySelector(`[data-date="${target.isoDate}"]`) as HTMLElement | null;
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'start' });
          } else {
            scrollRef.current.scrollLeft = target.index * COL_STEP - COL_STEP;
          }
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
    const dot = container.querySelector(`[data-date="${activeEntry.isoDate}"]`) as HTMLElement | null;
    if (!dot) return;
    // Only scroll if dot is not fully visible
    const cRect = container.getBoundingClientRect();
    const dRect = dot.getBoundingClientRect();
    if (dRect.left < cRect.left || dRect.right > cRect.right) {
      dot.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeDayIndex, dayEntries]);

  // Native wheel to horizontal scroll; keep vertical scrolling inside a day column.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      // If over a scrollable day column, let it scroll vertically
      const target = e.target as HTMLElement;
      const content = getDayContentScroller(target);
      if (content && canScrollDayContent(content, e.deltaY)) return;
      // Otherwise scroll horizontally
      e.preventDefault();
      el.scrollBy({ left: e.deltaY, behavior: 'instant' });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Date dots use the same horizontal wheel behavior.
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
    if (!hideEmpty && el && el.scrollWidth <= el.clientWidth + 10) return;

    setLoadingMore(true);

    if (hideEmpty) {
      const cursor = dayEntries[0]?.isoDate ?? weekMondays[0];
      const response = await fetchContentWeeks(cursor, 'previous', CONTENT_WEEK_LIMIT).catch(() => ({ weeks: [] }));
      const newWeeks = response.weeks
        .filter((data) => !weekDataMap.has(data.week.weekStart))
        .sort((a, b) => a.week.weekStart.localeCompare(b.week.weekStart));

      if (newWeeks.length === 0) {
        noMorePreviousRef.current = true;
      } else {
        setWeekDataMap((prev) => {
          const next = new Map(prev);
          for (const data of newWeeks) next.set(data.week.weekStart, data);
          return next;
        });
        setWeekMondays((prev) => [...newWeeks.map((data) => data.week.weekStart), ...prev]);
        scrollAdjustRef.current += newWeeks.length * WEEK_SCROLL;
        setActiveDayIndex((prev) => prev + newWeeks.length * 7);
      }

      setLoadingMore(false);
      return;
    }

    // Start from the furthest searched week, or the first loaded week
    const startMonday = furthestSearchedPrevRef.current ?? weekMondays[0];
    let searchDate = new Date(startMonday + 'T00:00:00');

    for (let attempt = 0; attempt < SEARCH_BATCH; attempt++) {
      searchDate.setDate(searchDate.getDate() - 7);
      const searchMonday = formatISODate(searchDate);

      // Stop if we've gone too far back
      if (searchMonday < MIN_DATE) {
        noMorePreviousRef.current = true;
        break;
      }

      furthestSearchedPrevRef.current = searchMonday;
      if (weekDataMap.has(searchMonday)) continue;

      const data = await loadWeek(searchMonday, true, hideEmpty);
      if (data) {
        setWeekMondays((prev) => [searchMonday, ...prev]);
        setActiveDayIndex((prev) => prev + 7);
        break;
      }
      // Empty week: keep searching.
    }

    setLoadingMore(false);
  }, [loadingMore, weekMondays, weekDataMap, loadWeek, hideEmpty, dayEntries]);

  // Load next week when scrolling near right edge (only if not in the future)
  const loadNextWeek = useCallback(async () => {
    if (loadingMore || weekMondays.length === 0 || noMoreNextRef.current) return;

    // Don't load more if content fits within viewport
    const el = scrollRef.current;
    if (!hideEmpty && el && el.scrollWidth <= el.clientWidth + 10) return;

    const todayMonday = formatISODate(getMonday(new Date()));

    setLoadingMore(true);

    if (hideEmpty) {
      const cursor = dayEntries[dayEntries.length - 1]?.isoDate ?? weekMondays[weekMondays.length - 1];
      const response = await fetchContentWeeks(cursor, 'next', CONTENT_WEEK_LIMIT).catch(() => ({ weeks: [] }));
      const newWeeks = response.weeks
        .filter((data) => !weekDataMap.has(data.week.weekStart))
        .sort((a, b) => a.week.weekStart.localeCompare(b.week.weekStart));

      if (newWeeks.length === 0) {
        noMoreNextRef.current = true;
      } else {
        setWeekDataMap((prev) => {
          const next = new Map(prev);
          for (const data of newWeeks) next.set(data.week.weekStart, data);
          return next;
        });
        setWeekMondays((prev) => [...prev, ...newWeeks.map((data) => data.week.weekStart)]);
      }

      setLoadingMore(false);
      return;
    }

    const startMonday = furthestSearchedNextRef.current ?? weekMondays[weekMondays.length - 1];
    let searchDate = new Date(startMonday + 'T00:00:00');

    for (let attempt = 0; attempt < SEARCH_BATCH; attempt++) {
      searchDate.setDate(searchDate.getDate() + 7);
      const searchMonday = formatISODate(searchDate);

      // Stop if we've gone into the future
      if (searchMonday > todayMonday) {
        noMoreNextRef.current = true;
        break;
      }

      furthestSearchedNextRef.current = searchMonday;
      if (weekDataMap.has(searchMonday)) continue;

      const data = await loadWeek(searchMonday, false, hideEmpty);
      if (data) {
        setWeekMondays((prev) => [...prev, searchMonday]);
        break;
      }
      // Empty week: keep searching.
    }

    setLoadingMore(false);
  }, [loadingMore, weekMondays, weekDataMap, loadWeek, hideEmpty, dayEntries]);

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
        if (hideEmpty && !entry.isToday && entry.images.length === 0 && entry.videos.length === 0) continue;
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
    return dayEntries.filter((e) => e.isToday || e.images.length > 0 || e.videos.length > 0);
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

  // Keyboard shortcuts for day navigation (only when this view is active)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't handle if input is focused or dialog is open
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if (document.querySelector('[data-dialog-overlay]')) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollToVisibleDay(visibleIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollToVisibleDay(visibleIndex + 1);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visibleIndex, scrollToVisibleDay]);

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
    <div className="workspace-day-board">
      <WorkspaceDateBar
        days={visibleEntries}
        activeIndex={Math.max(0, visibleIndex)}
        locale={locale}
        labels={{
          today: locale === 'zh' ? '\u4eca\u5929' : 'Today',
          previous: locale === 'zh' ? '\u4e0a\u4e00\u4e2a' : 'Previous',
          next: locale === 'zh' ? '\u4e0b\u4e00\u4e2a' : 'Next',
        }}
        previousIcon={<ChevronLeft />}
        nextIcon={<ChevronRight />}
        onPrevious={() => scrollToVisibleDay(visibleIndex - 1)}
        onToday={goToToday}
        onNext={() => scrollToVisibleDay(visibleIndex + 1)}
        onSelect={scrollToVisibleDay}
        filterLabel={hideEmpty ? (locale === 'zh' ? '\u7075\u611f' : 'Ideas') : (locale === 'zh' ? '\u5168\u90e8' : 'All')}
        filterActive={hideEmpty}
        onToggleFilter={() => {
          noMorePreviousRef.current = false;
          noMoreNextRef.current = false;
          furthestSearchedPrevRef.current = null;
          furthestSearchedNextRef.current = null;
          setHideEmpty(!hideEmpty);
        }}
        dotsRef={dotsRef}
      />
      {/* Horizontal scroll container; the wheel listener is attached above. */}
      <WorkspaceDayScroller
        scrollRef={scrollRef}
        onScroll={handleScroll}
        className="workspace-day-scroll"
        style={{
          scrollSnapType: visibleEntries.length > 3 ? 'x proximity' : 'none',
          overscrollBehaviorX: 'contain',
          willChange: 'scroll-position',
        }}
      >
        {dayEntries.map((entry, i) => {
          if (hideEmpty && !entry.isToday && entry.images.length === 0 && entry.videos.length === 0) return null;
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
                videos={entry.videos}
                viewMode="day"
                isToday={entry.isToday}
                dateStr={entry.isoDate}
                canUpload={entry.canUpload}
                animDelay={Math.min(i, 8) * 0.06 + 0.3}
                onRefresh={handleRefresh}
                onOpenVideo={onOpenVideo}
              />
            </motion.div>
          );
        })}

        {/* Loading indicator */}
        {loadingMore && (
          <div className="workspace-day-loading">
            <div className="workspace-loading-spinner" />
          </div>
        )}
      </WorkspaceDayScroller>

      {/* Notes (collapsible) */}
      <WorkspaceCollapsiblePanel
        open={notesOpen}
        onOpenChange={setNotesOpen}
        className="workspace-notes-panel relative"
        headingClassName="workspace-notes-toggle"
        labelClassName="workspace-notes-toggle-label"
        icon={notesOpen ? <ChevronDown /> : <ChevronUp />}
        label={t('Notes')}
      >
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
      </WorkspaceCollapsiblePanel>
    </div>
  );
}
