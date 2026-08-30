import { useEffect, useState } from 'react';
import { motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Settings, LayoutGrid, Columns, Search, Clock, Download } from 'lucide-react';
import { WorkspaceIconButton, WorkspaceViewTabs } from '@inspoclip/workspace-ui';
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

export function WeekHeader({
  monday,
  viewMode,
  onViewModeChange,
  onPrevWeek,
  onNextWeek,
  canGoNext: canGoNextProp,
  nextWeekBlockedAttempt = 0,
  searchOpen: searchOpenProp,
  onSearchOpenChange,
  onOpenVideo,
}: WeekHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [searchOpenLocal, setSearchOpenLocal] = useState(false);
  const searchOpen = searchOpenProp ?? searchOpenLocal;
  const setSearchOpen = onSearchOpenChange ?? setSearchOpenLocal;
  const { locale, toggle: toggleLocale } = useLanguage();
  const nextWeekControls = useAnimationControls();
  const prefersReducedMotion = useReducedMotion();

  const formatRange = (value: Date): string => {
    const sunday = new Date(value);
    sunday.setDate(value.getDate() + 6);
    const dateLocale = locale === 'zh' ? 'zh-CN' : 'en-US';
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${value.toLocaleDateString(dateLocale, options)} - ${sunday.toLocaleDateString(dateLocale, options)}`;
  };

  const weekNumber = getWeekNumber(monday);
  const weekLabel = locale === 'zh' ? `第 ${weekNumber} 周` : `Week ${weekNumber}`;
  const viewLabels = {
    day: locale === 'zh' ? '日视图' : 'Day view',
    week: locale === 'zh' ? '周视图' : 'Week view',
    timeline: locale === 'zh' ? '时间轴' : 'Timeline',
  } as const;
  const showWeekNav = viewMode === 'week';
  const todayMonday = formatISODate(getMonday(new Date()));
  const canGoNext = canGoNextProp ?? formatISODate(monday) < todayMonday;

  useEffect(() => {
    if (nextWeekBlockedAttempt <= 0 || prefersReducedMotion) return;
    void nextWeekControls.start({
      x: [0, -2.4, 1.2, -0.4, 0],
      scale: [1, 0.985, 1, 0.997, 1],
      transition: {
        duration: 0.38,
        times: [0, 0.26, 0.56, 0.8, 1],
        ease: [0.22, 1, 0.36, 1],
      },
    });
  }, [nextWeekBlockedAttempt, nextWeekControls, prefersReducedMotion]);

  return (
    <>
      <div className="workspace-header-layout">
        <div className="workspace-header-left">
          {showWeekNav && (
            <button type="button" onClick={onPrevWeek} className="workspace-header-nav-button" aria-label="Previous week">
              <ChevronLeft />
            </button>
          )}
          <WorkspaceViewTabs
            value={viewMode}
            labels={viewLabels}
            onChange={onViewModeChange}
            renderIcon={(mode) => mode === 'day' ? <Columns /> : mode === 'week' ? <LayoutGrid /> : <Clock />}
          />
        </div>

        <div className="workspace-header-heading">
          <h1>{weekLabel}</h1>
          <p>{formatRange(monday)}</p>
        </div>

        <div className="workspace-header-actions">
          <button type="button" onClick={toggleLocale} className="workspace-language-button" title={locale === 'zh' ? '切换到英文' : 'Switch to Chinese'}>
            {locale === 'zh' ? 'EN' : '中'}
          </button>
          <WorkspaceIconButton className="workspace-icon-button" label={locale === 'zh' ? '导出' : 'Export'} onClick={() => setExportOpen(true)} icon={<Download />} />
          <WorkspaceIconButton className="workspace-icon-button" label={locale === 'zh' ? '搜索' : 'Search'} onClick={() => setSearchOpen(true)} icon={<Search />} />
          <WorkspaceIconButton className="workspace-icon-button" label={locale === 'zh' ? 'AI 设置' : 'AI Settings'} onClick={() => setSettingsOpen(true)} icon={<Settings />} />
          <ThemeToggle />
          {showWeekNav && (
            <motion.button type="button" onClick={onNextWeek} animate={nextWeekControls} aria-disabled={!canGoNext} className={`workspace-header-nav-button${canGoNext ? '' : ' is-disabled'}`} aria-label="Next week">
              <ChevronRight />
            </motion.button>
          )}
        </div>
      </div>

      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} onOpenVideo={onOpenVideo} />
      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} weekDate={formatISODate(monday)} scope={viewMode === 'week' ? 'week' : 'all'} />
    </>
  );
}
