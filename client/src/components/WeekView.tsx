import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { WorkspaceDayBoard, WorkspaceCollapsiblePanel, type WorkspaceAsset, type WorkspaceDay } from '@inspoclip/workspace-ui';
import { DayColumn } from './DayColumn';
import { NotesArea } from './NotesArea';
import { ALL_DAYS, type WeekData, type Image as ImageType } from '@/types';
import type { WeekVideo } from '@/types/video';
import { useLanguage } from '@/context/LanguageContext';
import { saveNotes } from '@/lib/api';
import { formatISODate } from '@/lib/utils';

const LINE_STEP = 28;
const MIN_H = 84;
const MAX_H = 420;

interface WeekViewProps {
  weekData: WeekData | null;
  onRefresh: () => void;
  onOpenVideo: (videoId: string, jobId?: string) => void;
}

type ClientWeekDay = WorkspaceDay<WorkspaceAsset> & {
  dayOfWeek: number;
  weekId: string;
  images: ImageType[];
  videos: WeekVideo[];
  dateStr?: string;
  canUpload: boolean;
};

function toWorkspaceAsset(kind: 'image' | 'video', id: string, createdAt: string): WorkspaceAsset {
  return { id, kind, createdAt };
}

export function WeekView({ weekData, onRefresh, onOpenVideo }: WeekViewProps) {
  const { t, locale } = useLanguage();
  const [notesContent, setNotesContent] = useState(weekData?.notes?.content || '');
  const [notesHeight, setNotesHeight] = useState(140);
  const [notesOpen, setNotesOpen] = useState(true);
  const resizeRef = useRef<HTMLDivElement>(null);
  const resizing = useRef(false);

  const weekId = weekData?.week?.id || '';
  const handleNotesBlur = useCallback(() => {
    if (weekId) void saveNotes(weekId, notesContent);
  }, [notesContent, weekId]);

  const handleResizeMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();
    resizing.current = true;
    const startY = event.clientY;
    const startHeight = notesHeight;
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizing.current) return;
      const snapped = Math.round((startHeight + moveEvent.clientY - startY) / LINE_STEP) * LINE_STEP;
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

  const todayIso = formatISODate(new Date());
  const days: ClientWeekDay[] = ALL_DAYS.map(({ dayOfWeek }) => {
    const date = weekData?.week?.weekStart ? new Date(`${weekData.week.weekStart}T00:00:00`) : new Date();
    date.setDate(date.getDate() + dayOfWeek);
    const dateStr = formatISODate(date);
    const images = weekData?.images.filter((image) => image.dayOfWeek === dayOfWeek) || [];
    const videos = weekData?.videos?.filter((video) => video.dayOfWeek === dayOfWeek) || [];
    const assets = [
      ...images.map((image) => toWorkspaceAsset('image', image.id, image.createdAt)),
      ...videos.map((video) => toWorkspaceAsset('video', video.id, video.createdAt)),
    ];
    return { isoDate: dateStr, date, assets, isToday: dateStr === todayIso, dayOfWeek, weekId, images, videos, dateStr, canUpload: dateStr === todayIso };
  });

  return (
    <WorkspaceDayBoard
      days={days}
      locale={locale}
      previousIcon={<ChevronLeft />}
      nextIcon={<ChevronRight />}
      labels={{
        today: locale === 'zh' ? '今天' : 'Today',
        previous: locale === 'zh' ? '上一天' : 'Previous day',
        next: locale === 'zh' ? '下一天' : 'Next day',
        all: locale === 'zh' ? '全部' : 'All',
        ideas: locale === 'zh' ? '灵感' : 'Ideas',
      }}
      renderColumn={(day) => {
        const clientDay = day as ClientWeekDay;
        return <DayColumn key={clientDay.isoDate} dayName={ALL_DAYS[clientDay.dayOfWeek].dayName} dayOfWeek={clientDay.dayOfWeek} weekId={clientDay.weekId} images={clientDay.images} videos={clientDay.videos} viewMode="week" isToday={clientDay.isToday} dateStr={clientDay.dateStr} canUpload={clientDay.canUpload} onRefresh={onRefresh} onOpenVideo={onOpenVideo} />;
      }}
      notes={(
        <WorkspaceCollapsiblePanel
          open={notesOpen}
          onOpenChange={setNotesOpen}
          className="workspace-notes-panel relative"
          headingClassName="workspace-notes-toggle"
          labelClassName="workspace-notes-toggle-label"
          icon={notesOpen ? <ChevronDown /> : <ChevronUp />}
          label={t('Notes')}
        >
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <NotesArea content={notesContent} onChange={setNotesContent} onBlur={handleNotesBlur} height={notesHeight} onResizeMouseDown={handleResizeMouseDown} resizeRef={resizeRef} />
          </motion.div>
        </WorkspaceCollapsiblePanel>
      )}
    />
  );
}
