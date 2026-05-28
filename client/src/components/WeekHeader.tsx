import { useState } from 'react';
import { ChevronLeft, ChevronRight, Settings, LayoutGrid, Columns, Search } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { SettingsDialog } from './SettingsDialog';
import { SearchDialog } from './SearchDialog';
import { useLanguage } from '@/context/LanguageContext';
import { getWeekNumber, getMonday, formatISODate } from '@/lib/utils';
import type { ViewMode } from '@/types';

interface WeekHeaderProps {
  monday: Date;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  searchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
}

export function WeekHeader({ monday, viewMode, onViewModeChange, onPrevWeek, onNextWeek, searchOpen: searchOpenProp, onSearchOpenChange }: WeekHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpenLocal, setSearchOpenLocal] = useState(false);
  const searchOpen = searchOpenProp ?? searchOpenLocal;
  const setSearchOpen = onSearchOpenChange ?? setSearchOpenLocal;
  const { locale, toggle: toggleLocale } = useLanguage();

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
  const canGoNext = currentMondayStr < todayMonday;

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
            <button
              onClick={onNextWeek}
              disabled={!canGoNext}
              className="p-2 rounded-full hover:bg-[var(--muted)] transition-colors disabled:opacity-30"
              aria-label="Next week"
            >
              <ChevronRight className="w-6 h-6 text-[var(--accent)]" />
            </button>
          )}
        </div>
      </div>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
