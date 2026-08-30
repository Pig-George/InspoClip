import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { WorkspaceTimelineHeader, WorkspaceTimelineList } from '@inspoclip/workspace-ui';
import { fetchMonth } from '@/lib/api';
import type { TimelineMonth } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { getWeekNumber, formatDateRange } from '@/lib/utils';
import { VideoCard } from '@/components/video/VideoCard';
import { ImageCard } from '@/components/ImageCard';
import type { Image as ImageType } from '@/types';
import type { WeekVideo } from '@/types/video';

interface TimelineViewProps {
  onOpenVideo: (videoId: string, jobId?: string) => void;
}

type TimelineItem =
  | { kind: 'image'; value: ImageType }
  | { kind: 'video'; value: WeekVideo };

export function TimelineView({ onOpenVideo }: TimelineViewProps) {
  const [data, setData] = useState<TimelineMonth | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(false);
  const { locale } = useLanguage();

  const loadMonth = useCallback(async (month: string) => {
    setLoading(true);
    try {
      setData(await fetchMonth(month));
    } catch (error) {
      console.error('Failed to load month:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadMonth(currentMonth); }, [currentMonth, loadMonth]);

  const goToPrevMonth = useCallback(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    setCurrentMonth(month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`);
  }, [currentMonth]);

  const goToNextMonth = useCallback(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
    const now = new Date();
    const maxMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (next <= maxMonth) setCurrentMonth(next);
  }, [currentMonth]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable || document.querySelector('[data-dialog-overlay]')) return;
      if (event.key === 'ArrowLeft') { event.preventDefault(); goToPrevMonth(); }
      if (event.key === 'ArrowRight') { event.preventDefault(); goToNextMonth(); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [goToNextMonth, goToPrevMonth]);

  const monthLabel = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    return new Date(year, month - 1).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'long' });
  }, [currentMonth, locale]);
  const currentCalendarMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const groups = useMemo(() => (data?.weeks || []).map((weekData) => {
    const start = new Date(`${weekData.week.weekStart}T00:00:00`);
    const images = weekData.images.map((value) => ({ kind: 'image' as const, value }));
    const videos = (weekData.videos || []).map((value) => ({ kind: 'video' as const, value }));
    return {
      id: weekData.week.id,
      label: locale === 'zh' ? `第 ${getWeekNumber(start)} 周` : `Week ${getWeekNumber(start)}`,
      meta: formatDateRange(start),
      items: [...images, ...videos],
    };
  }), [data?.weeks, locale]);

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64 text-[var(--text-muted)] text-xl font-handwriting">{locale === 'zh' ? '加载中...' : 'Loading...'}</div>;
  }

  return (
    <section className="workspace-timeline-view inspoclip-workspace">
      <WorkspaceTimelineHeader
        title={monthLabel}
        meta={`${groups.reduce((sum, group) => sum + group.items.length, 0)} ${locale === 'zh' ? '个灵感' : 'inspirations'}`}
        previousLabel={locale === 'zh' ? '上个月' : 'Previous month'}
        nextLabel={locale === 'zh' ? '下个月' : 'Next month'}
        previousIcon={<ChevronLeft />}
        nextIcon={<ChevronRight />}
        canGoNext={currentMonth < currentCalendarMonth}
        onPrevious={goToPrevMonth}
        onNext={goToNextMonth}
      />

      <WorkspaceTimelineList
        groups={groups}
        empty={<><Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" /><p className="font-handwriting">{locale === 'zh' ? '本月暂无灵感记录' : 'No inspirations this month'}</p></>}
        emptyClassName="text-center py-16 text-[var(--text-muted)]"
        renderItem={(item, index, group) => (
          <motion.div
            key={`${item.kind}-${item.value.id}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(index, 8) * 0.05 }}
          >
            {item.kind === 'image'
              ? <ImageCard image={item.value} onRefresh={() => void loadMonth(currentMonth)} animDelay={0} />
              : <VideoCard video={item.value} onOpen={onOpenVideo} onRefresh={() => void loadMonth(currentMonth)} />}
          </motion.div>
        )}
      />
    </section>
  );
}
