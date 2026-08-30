import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X, RotateCcw, Video } from 'lucide-react';
import { deleteVideo, retryVideo, videoThumbnailUrl } from '@/lib/video-api';
import { toast } from '@/components/Toast';
import { useLanguage } from '@/context/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';
import { useScrollLock } from '@/hooks/useScrollLock';
import { localizedText } from '@/lib/localized-text';
import type { DecorationType } from '@/types';
import type { WeekVideo } from '@/types/video';
import { WorkspaceAssetCard, WorkspaceConfirmDialog } from '@inspoclip/workspace-ui';

interface VideoCardProps {
  video: WeekVideo;
  onOpen: (videoId: string, jobId?: string) => void;
  onRefresh: () => void;
}

const MENU_W = 120;
const MENU_H = 72;

function formatDuration(durationMs: number): string {
  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

const statusTranslationKey: Record<NonNullable<WeekVideo['job']>['status'], TranslationKey> = {
  pending: 'VideoAnalysisPending',
  processing: 'VideoAnalysisProcessing',
  completed: 'VideoAnalysisCompleted',
  failed: 'VideoAnalysisFailed',
};
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
  const { locale, t } = useLanguage();
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const rawPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const confirmOverlayRef = useScrollLock(showConfirm);

  const closeMenu = useCallback(() => setMenuPos(null), []);

  useEffect(() => {
    if (!menuPos) return;
    const handler = () => closeMenu();
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [menuPos, closeMenu]);

  useEffect(() => {
    if (!showConfirm) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowConfirm(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showConfirm]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = e.clientX;
    let y = e.clientY;
    if (x + MENU_W > vw) x = e.clientX - MENU_W;
    if (y + MENU_H > vh) y = e.clientY - MENU_H;
    x = Math.max(0, Math.min(x, vw - MENU_W));
    y = Math.max(0, Math.min(y, vh - MENU_H));
    rawPosRef.current = { x, y };
    setMenuPos({ x, y });
  };

  useLayoutEffect(() => {
    if (!menuPos || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    let x = rawPosRef.current.x;
    let y = rawPosRef.current.y;
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 4;
    if (x < 0) x = 4;
    if (y < 0) y = 4;
    if (x !== menuPos.x || y !== menuPos.y) setMenuPos({ x, y });
  }, [menuPos]);

  const handleDeleteClick = () => { closeMenu(); setShowConfirm(true); };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteVideo(video.id);
      onRefresh();
      toast('success', '视频已删除');
    } catch {
      toast('error', '删除失败，请重试');
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleRetry = async (e: React.MouseEvent) => {
    e.stopPropagation();
    closeMenu();
    await retryVideo(video.id);
    onRefresh();
  };

  const title = video.summary ? localizedText(video.summary, locale) : video.originalName;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="contents"
    >
      <WorkspaceAssetCard
        kind="video"
        title={title}
        alt={title}
        mediaSrc={video.thumbnailPath ? videoThumbnailUrl(video.id) : undefined}
        mediaFallback={<Video className="workspace-card-fallback-icon" />}
        durationLabel={formatDuration(video.durationMs)}
        decoration={decoration}
        rotation={rotate}
        subtitle={<>
          {video.job ? t(statusTranslationKey[video.job.status]) : t('VideoAnalysisPending')}
          {video.job?.status === 'processing' && <span className="workspace-video-progress">{video.job.progress}%</span>}
        </>}
        subtitleClassName={`workspace-video-caption-status ${video.job?.status === 'failed' ? 'is-failed' : ''}`}
        onClick={() => onOpen(video.id, video.job?.id)}
        onContextMenu={handleContextMenu}
        ariaLabel={`打开视频分析 ${title}`}
      />

      {/* Context menu */}
      {createPortal(
        <AnimatePresence>
          {menuPos && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed z-[60] py-1 rounded-lg bg-[var(--card)] border border-[var(--card-border)] shadow-xl min-w-[100px]"
              style={{ left: menuPos.x, top: menuPos.y }}
              onClick={(e) => e.stopPropagation()}
            >
              {video.job?.status === 'failed' && (
                <button
                  onClick={handleRetry}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors font-heading"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  重试分析
                </button>
              )}
              <button
                onClick={handleDeleteClick}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors font-heading"
              >
                <Trash2 className="w-3.5 h-3.5" />
                删除视频
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Delete confirmation */}
      {createPortal(
        <AnimatePresence>
          {showConfirm && (
            <WorkspaceConfirmDialog
              ref={confirmOverlayRef}
              title="确认删除"
              description="视频及其分析结果将被永久删除"
              cancelLabel="取消"
              confirmLabel={deleting ? '删除中…' : '确认'}
              icon={<AlertTriangle />}
              pending={deleting}
              onCancel={() => setShowConfirm(false)}
              onConfirm={handleConfirmDelete}
            />
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
