import { useEffect, useState } from 'react';
import { DayName, Image as ImageType, ViewMode } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { ImageUploader } from './ImageUploader';
import { SortableImageCard } from './SortableImageCard';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { reorderImages } from '@/lib/api';
import { VideoCard } from './video/VideoCard';
import type { WeekVideo } from '@/types/video';
import { WorkspaceDayColumn } from '@inspoclip/workspace-ui';

interface DayColumnProps {
  dayName: DayName;
  dayOfWeek: number;
  weekId: string;
  images: ImageType[];
  videos: WeekVideo[];
  viewMode: ViewMode;
  isToday: boolean;
  dateStr?: string;
  canUpload?: boolean;
  animDelay?: number;
  onRefresh: () => void;
  onOpenVideo: (videoId: string, jobId?: string) => void;
}

export function DayColumn({
  dayName,
  dayOfWeek,
  weekId,
  images,
  videos,
  viewMode,
  isToday,
  dateStr,
  canUpload = true,
  animDelay = 0,
  onRefresh,
  onOpenVideo,
}: DayColumnProps) {
  const { t, locale } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const check = () => setDialogOpen(!!document.querySelector('[data-dialog-overlay]'));
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true });
    check();
    return () => observer.disconnect();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const newImages = [...images];
    const [moved] = newImages.splice(oldIndex, 1);
    newImages.splice(newIndex, 0, moved);
    const orders = newImages.map((img, i) => ({ id: img.id, sortOrder: i }));

    try {
      await reorderImages(orders);
    } catch (err) {
      console.error('Reorder failed:', err);
    }
    onRefresh();
  };

  const dateLabel = dateStr
    ? new Date(`${dateStr}T00:00:00`).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      month: 'short',
      day: 'numeric',
    })
    : undefined;
  const maxHeight = viewMode === 'day' ? 'calc(100vh - 250px)' : 'calc(100vh - 280px)';

  return (
    <WorkspaceDayColumn
      isoDate={dateStr}
      dataDayColumn
      weekdayLabel={t(dayName)}
      dateLabel={dateLabel}
      count={images.length + videos.length}
      isToday={isToday}
      todayLabel={locale === 'zh' ? '今天' : 'Today'}
      className={`client-day-column client-day-column-${viewMode}`}
      style={{ maxHeight }}
      headerClassName="workspace-day-column-header"
      headerContentClassName="workspace-day-column-header-content"
      headerTitleClassName="workspace-day-column-title"
      headerDateClassName="workspace-day-column-date"
      headerTodayClassName="workspace-day-column-today"
      countClassName="workspace-day-count"
      contentClassName="workspace-day-content client-day-column-content"
      footerClassName="workspace-day-footer"
      footer={
        canUpload ? (
          <ImageUploader weekId={weekId} dayOfWeek={dayOfWeek} onUploaded={onRefresh} onOpenVideo={onOpenVideo} />
        ) : (
          <p className="client-day-upload-disabled">{locale === 'zh' ? '仅今日可上传' : 'Upload only today'}</p>
        )
      }
    >
      {videos.map((video) => <VideoCard key={video.id} video={video} onOpen={onOpenVideo} onRefresh={onRefresh} />)}
      {images.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images.map((img) => img.id)} strategy={verticalListSortingStrategy}>
            {images.map((image) => (
              <SortableImageCard
                key={image.id}
                image={image}
                onRefresh={onRefresh}
                animDelay={animDelay}
                disabled={dialogOpen}
              />
            ))}
          </SortableContext>
        </DndContext>
      ) : videos.length === 0 ? (
        <div className="client-day-empty">{canUpload ? t('PasteOrDrop') : t('EmptyPage')}</div>
      ) : null}
    </WorkspaceDayColumn>
  );
}
