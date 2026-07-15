import { useEffect, useState } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Settings, LayoutGrid, Columns, Search, Clock, Download } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { SettingsDialog } from './SettingsDialog';
import { SearchDialog } from './SearchDialog';
import { ExportDialog } from './ExportDialog';
import { useLanguage } from '@/context/LanguageContext';
import { getWeekNumber, getMonday, formatISODate } from '@/lib/utils';
import type { ViewMode } from '@/types';

interface WeekHeaderProps {
  monday: Date;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  canGoNext?: boolean;
  nextWeekBlockedAttempt?: number;
  searchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
  onOpenVideo?: (videoId: string, jobId?: string) => void;
}

export function WeekHeader({ monday, viewMode, onViewModeChange, onPrevWeek, onNextWeek, canGoNext: canGoNextProp, nextWeekBlockedAttempt = 0, searchOpen: searchOpenProp, onSearchOpenChange, onOpenVideo }: WeekHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [searchOpenLocal, setSearchOpenLocal] = useState(false);
  const searchOpen = searchOpenProp ?? searchOpenLocal;
  const setSearchOpen = onSearchOpenChange ?? setSearchOpenLocal;
  const { locale, toggle: toggleLocale } = useLanguage();
  const nextWeekControls = useAnimationControls();
  const prefersReducedMotion = useReducedMotion();

  const formatRange = (monday: Date): string => {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const loc = locale === 'zh' ? 'zh-CN' : 'en-US';
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${monday.toLocaleDateString(loc, opts)} - ${sunday.toLocaleDateString(loc, opts)}`;
  };

  const weekNum = getWeekNumber(monday);
  const weekLabel = locale === 'zh'
    ? `第 ${weekNum} 周`
    : `Week ${weekNum}`;

  const showWeekNav = viewMode === 'week';
  const todayMonday = formatISODate(getMonday(new Date()));
  const currentMondayStr = formatISODate(monday);
  const canGoNext = canGoNextProp ?? currentMondayStr < todayMonday;

  useEffect(() => {
    if (nextWeekBlockedAttempt <= 0 || prefersReducedMotion) return;
    void nextWeekControls.start({
      x: [0, -4, 4, -3, 3, 0],
      transition: { duration: 0.25, ease: 'easeInOut' },
    });
  }, [nextWeekBlockedAttempt, nextWeekControls, prefersReducedMotion]);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        {/* Left: navigation + view toggle */}
        <div className="flex items-center gap-1">
          {showWeekNav && (
            <button
              onClick={onPrevWeek}
              className="p-2 rounded-full hover:bg-[var(--muted)] transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-6 h-6 text-[var(--accent)]" />
            </button>
          )}

          {/* View mode toggle */}
          <div className="flex items-center bg-[var(--muted)] rounded-lg p-0.5 ml-1">
            <button
              onClick={() => onViewModeChange('day')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'day'
                  ? 'bg-[var(--card)] text-[var(--accent)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
              title={locale === 'zh' ? '日视图' : 'Day view'}
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('week')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'week'
                  ? 'bg-[var(--card)] text-[var(--accent)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
              title={locale === 'zh' ? '周视图' : 'Week view'}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('timeline')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-[var(--card)] text-[var(--accent)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
              title={locale === 'zh' ? '时间轴' : 'Timeline'}
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Week info */}
        <div className="text-center">
          <h1 className="text-2xl font-heading font-bold text-[var(--text)]">
            {weekLabel}
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5 font-handwriting">
            {formatRange(monday)}
          </p>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1">
          {/* Language toggle */}
          <button
            onClick={toggleLocale}
            className="px-2 py-1 rounded-md text-xs font-heading font-semibold text-[var(--accent)]
              hover:bg-[var(--muted)] transition-colors min-w-[32px]"
            title={locale === 'zh' ? 'Switch to English' : '切换到中文'}
          >
            {locale === 'zh' ? 'EN' : '中'}
          </button>

          <button
            onClick={() => setExportOpen(true)}
            className="p-2 rounded-full hover:bg-[var(--muted)] transition-colors"
            aria-label="Export"
          >
            <Download className="w-5 h-5 text-[var(--accent)]" />
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-full hover:bg-[var(--muted)] transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5 text-[var(--accent)]" />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-[var(--muted)] transition-colors"
            aria-label="AI Settings"
          >
            <Settings className="w-5 h-5 text-[var(--accent)]" />
          </button>
          <ThemeToggle />
          {showWeekNav && (
            <motion.button
              onClick={onNextWeek}
              animate={nextWeekControls}
              aria-disabled={!canGoNext}
              className={`p-2 rounded-full transition-colors ${
                canGoNext ? 'hover:bg-[var(--muted)]' : 'opacity-30 cursor-not-allowed'
              }`}
              aria-label="Next week"
            >
              <ChevronRight className="w-6 h-6 text-[var(--accent)]" />
            </motion.button>
          )}
        </div>
      </div>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} onOpenVideo={onOpenVideo} />
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        weekDate={formatISODate(monday)}
        scope={viewMode === 'week' ? 'week' : 'all'}
      />
    </>
  );
}
