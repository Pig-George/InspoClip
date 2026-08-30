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
import { WorkspaceDetailDialog, WorkspaceDetailSection, WorkspaceMediaPreview } from '@inspoclip/workspace-ui';

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
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="contents"
        >
        <WorkspaceDetailDialog
              ref={overlayRef}
              title={copy.title}
              closeLabel={copy.close}
              onClose={handleBack}
              closeButtonClassName="workspace-dialog-close"
              closeButton={<X />}
              bodyClassName="workspace-video-detail-body"
              media={<WorkspaceMediaPreview kind="video" src={videoContentUrl(videoId)} alt={copy.title} mediaClassName="workspace-detail-media" videoRef={player} videoProps={{ controls: true, playsInline: true, preload: 'metadata' }} />}
            >
                {error && <p className="workspace-analysis-error">{error}</p>}
                {job && job.status !== 'completed' && (
                  <VideoJobProgress job={job} onRetry={async () => setJob(await retryVideo(videoId))} />
                )}
                <WorkspaceDetailSection title={copy.tags}>
                  <TagManager videoId={videoId} imageTags={detail?.tags ?? []} onTagsChange={load} />
                </WorkspaceDetailSection>
                <WorkspaceDetailSection title={copy.stageAnalysis}>
                  {detail?.analysis ? (
                    <>
                      <h4 className="workspace-analysis-summary">
                        {localizedText(detail.analysis.summary, locale)}
                      </h4>
                      <VideoTimeline stages={detail.analysis.stages} onSelect={selectStage} locale={locale} />
                    </>
                  ) : (
                    <p className="workspace-analysis-empty">{copy.emptyStages}</p>
                  )}
                </WorkspaceDetailSection>
                {detail?.analysis && <VideoPromptPanel videoId={videoId} />}
        </WorkspaceDetailDialog>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
