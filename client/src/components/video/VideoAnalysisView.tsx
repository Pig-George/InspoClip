import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { fetchVideo, fetchVideoJob, retryVideo, videoContentUrl } from '@/lib/video-api';
import type { VideoDetail, VideoJob, VideoStage } from '@/types/video';
import { useLanguage } from '@/context/LanguageContext';
import { localizedText } from '@/lib/localized-text';
import { useScrollLock } from '@/hooks/useScrollLock';
import { TagManager } from '@/components/TagManager';
import { VideoJobProgress } from './VideoJobProgress';
import { VideoTimeline } from './VideoTimeline';
import { VideoPromptPanel } from './VideoPromptPanel';

interface VideoAnalysisViewProps {
  open?: boolean;
  videoId?: string | null;
  initialJobId?: string;
  onBack: () => void;
  onRefresh?: () => void;
}

const detailCopy = {
  zh: {
    title: '视频动效分析',
    close: '关闭',
    loadFailed: '加载失败',
    tags: '标签',
    stageAnalysis: '阶段分析',
    emptyStages: '分析完成后将在此显示阶段时间线。',
  },
  en: {
    title: 'Video motion analysis',
    close: 'Close',
    loadFailed: 'Failed to load',
    tags: 'Tags',
    stageAnalysis: 'Stage analysis',
    emptyStages: 'The stage timeline will appear here after analysis completes.',
  },
} as const;

export function VideoAnalysisView({ open = true, videoId, initialJobId, onBack, onRefresh }: VideoAnalysisViewProps) {
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [job, setJob] = useState<VideoJob | null>(null);
  const [error, setError] = useState('');
  const player = useRef<HTMLVideoElement>(null);
  const overlayRef = useScrollLock(open);
  const { locale } = useLanguage();
  const copy = detailCopy[locale];
  const prevJobStatus = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!videoId) return;
    const value = await fetchVideo(videoId);
    setDetail(value);
    setJob(value.job);
  }, [videoId]);

  useEffect(() => {
    if (!open || !videoId) return;

    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const current = initialJobId ? await fetchVideoJob(initialJobId) : (await fetchVideo(videoId)).job;
        if (cancelled) return;
        if (current) setJob(current);
        if (current?.status === 'completed') {
          await load();
          return;
        }
        if (current?.status !== 'failed') {
          timer = window.setTimeout(poll, 1500);
        }
      } catch (value) {
        if (!cancelled) setError(value instanceof Error ? value.message : copy.loadFailed);
      }
    };

    setError('');
    load().then(poll).catch((value) => setError(value instanceof Error ? value.message : copy.loadFailed));

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [copy.loadFailed, initialJobId, load, open, videoId]);

  // Notify parent when job transitions to completed so video cards refresh.
  useEffect(() => {
    if (job?.status === 'completed' && prevJobStatus.current !== 'completed') {
      onRefresh?.();
    }
    prevJobStatus.current = job?.status ?? null;
  }, [job?.status, onRefresh]);

  // Notify parent when dialog closes (tags may have changed or analysis completed).
  const handleBack = useCallback(() => {
    onRefresh?.();
    onBack();
  }, [onBack, onRefresh]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleBack();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleBack]);

  const selectStage = (stage: VideoStage) => {
    if (player.current) {
      player.current.currentTime = stage.startTime;
      void player.current.play();
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && videoId && (
        <motion.div
          ref={overlayRef}
          data-dialog-overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) handleBack();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={copy.title}
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            className="w-full max-w-4xl max-h-[85vh] flex rounded-2xl bg-[var(--card)] border border-[var(--card-border)] shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex-1 min-w-0 bg-gray-200/50 flex items-center justify-center p-4">
              <video ref={player} className="max-h-[80vh] w-full rounded-lg bg-black" controls src={videoContentUrl(videoId)} />
            </div>

            <div className="w-[320px] flex-shrink-0 flex flex-col border-l border-[var(--card-border)]">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--card-border)]">
                <h2 className="text-base font-heading font-semibold text-[var(--text)]">{copy.title}</h2>
                <button
                  type="button"
                  aria-label={copy.close}
                  onClick={handleBack}
                  className="p-1 rounded-full hover:bg-[var(--muted)] transition-colors"
                >
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {error && <p className="text-sm text-red-500">{error}</p>}
                {job && job.status !== 'completed' && (
                  <VideoJobProgress job={job} onRetry={async () => setJob(await retryVideo(videoId))} />
                )}
                <div>
                  <h3 className="text-xs font-heading text-[var(--text-muted)] mb-2 uppercase tracking-wide">{copy.tags}</h3>
                  <TagManager videoId={videoId} imageTags={detail?.tags ?? []} onTagsChange={load} />
                </div>
                <div>
                  <h3 className="text-xs font-heading text-[var(--text-muted)] mb-2 uppercase tracking-wide">{copy.stageAnalysis}</h3>
                  {detail?.analysis ? (
                    <>
                      <h4 className="mb-3 text-sm font-heading text-[var(--text)]">
                        {localizedText(detail.analysis.summary, locale)}
                      </h4>
                      <VideoTimeline stages={detail.analysis.stages} onSelect={selectStage} locale={locale} />
                    </>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">{copy.emptyStages}</p>
                  )}
                </div>
                {detail?.analysis && <VideoPromptPanel videoId={videoId} />}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
