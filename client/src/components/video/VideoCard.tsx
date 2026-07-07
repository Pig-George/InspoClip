import { RotateCcw, Trash2, Video } from 'lucide-react';
import { deleteVideo, retryVideo, videoThumbnailUrl } from '@/lib/video-api';
import { DecorElement } from '@/components/DecorElement';
import type { DecorationType } from '@/types';
import type { WeekVideo } from '@/types/video';

interface VideoCardProps {
  video: WeekVideo;
  onOpen: (videoId: string, jobId?: string) => void;
  onRefresh: () => void;
}

function formatDuration(durationMs: number): string {
  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

const statusLabel = { pending: '等待分析', processing: '分析中', completed: '分析完成', failed: '分析失败' } as const;
const decorations: DecorationType[] = ['tape', 'pin', 'clip', 'washi', 'stitch', 'staple', 'sticker', 'corner'];

function stableCharCode(value: string, index: number): number {
  return value.charCodeAt(index % Math.max(1, value.length)) || 0;
}

function videoCardStyle(videoId: string): { rotate: number; decoration: DecorationType } {
  return {
    rotate: stableCharCode(videoId, 0) % 5 - 2,
    decoration: decorations[stableCharCode(videoId, 1) % decorations.length],
  };
}

export function VideoCard({ video, onOpen, onRefresh }: VideoCardProps) {
  const { rotate, decoration } = videoCardStyle(video.id);
  const handleDelete = async (event: React.MouseEvent) => {
    event.stopPropagation();
    await deleteVideo(video.id);
    onRefresh();
  };
  const handleRetry = async (event: React.MouseEvent) => {
    event.stopPropagation();
    await retryVideo(video.id);
    onRefresh();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`打开视频分析 ${video.originalName}`}
      onClick={() => onOpen(video.id, video.job?.id)}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpen(video.id, video.job?.id); }}
      className="polaroid group/video relative w-full cursor-pointer rounded-sm border border-[var(--card-border)] bg-[var(--card)] p-2 shadow-md transition-transform hover:shadow-lg"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <div data-video-decoration>
        <DecorElement type={decoration} />
      </div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-[var(--muted)]">
        {video.thumbnailPath ? (
          <img src={videoThumbnailUrl(video.id)} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center"><Video className="h-9 w-9 text-[var(--text-muted)] opacity-50" /></div>
        )}
        <span className="absolute bottom-2 right-2 rounded bg-black/65 px-1.5 py-0.5 font-mono text-[10px] text-white">{formatDuration(video.durationMs)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="truncate font-heading text-xs font-medium text-[var(--text)]">{video.originalName}</p>
          <p className={`text-[10px] font-handwriting ${video.job?.status === 'failed' ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
            {video.job ? statusLabel[video.job.status] : '等待分析'}
            {video.job?.status === 'processing' && <span className="ml-1">{video.job.progress}%</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover/video:opacity-100 group-focus-within/video:opacity-100">
          {video.job?.status === 'failed' && <button type="button" aria-label="重试分析" onClick={handleRetry} className="rounded p-1 text-[var(--accent)] hover:bg-[var(--accent)]/10"><RotateCcw className="h-3.5 w-3.5" /></button>}
          <button type="button" aria-label="删除视频" onClick={handleDelete} className="rounded p-1 text-red-400 hover:bg-red-400/10"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
