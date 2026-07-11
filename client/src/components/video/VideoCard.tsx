import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X, RotateCcw, Video } from 'lucide-react';
import { deleteVideo, retryVideo, videoThumbnailUrl } from '@/lib/video-api';
import { DecorElement } from '@/components/DecorElement';
import { toast } from '@/components/Toast';
import { useLanguage } from '@/context/LanguageContext';
import { useScrollLock } from '@/hooks/useScrollLock';
import { localizedText } from '@/lib/localized-text';
import type { DecorationType } from '@/types';
import type { WeekVideo } from '@/types/video';

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
  const { locale } = useLanguage();
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
      animate={{ opacity: 1, rotate }}
      exit={{ opacity: 0 }}
      className="polaroid relative w-full cursor-pointer rounded-sm"
      onContextMenu={handleContextMenu}
      onClick={() => onOpen(video.id, video.job?.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(video.id, video.job?.id); }}
      role="button"
      tabIndex={0}
      aria-label={`打开视频分析 ${title}`}
    >
      <DecorElement type={decoration} />
      <div className="relative aspect-[4/3] overflow-hidden rounded-sm bg-[var(--muted)]">
        {video.thumbnailPath ? (
          <img src={videoThumbnailUrl(video.id)} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center"><Video className="h-9 w-9 text-[var(--text-muted)] opacity-50" /></div>
        )}
        <span className="absolute bottom-2 right-2 rounded bg-black/65 px-1.5 py-0.5 font-mono text-[10px] text-white">{formatDuration(video.durationMs)}</span>
      </div>
      <div className="mt-2 px-1">
        <p className="truncate font-heading text-xs font-medium text-[var(--text)]">{title}</p>
        <p className={`text-[10px] font-handwriting ${video.job?.status === 'failed' ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
          {video.job ? statusLabel[video.job.status] : '等待分析'}
          {video.job?.status === 'processing' && <span className="ml-1">{video.job.progress}%</span>}
        </p>
      </div>

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
            <motion.div
              ref={confirmOverlayRef}
              data-dialog-overlay
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[85] flex items-center justify-center bg-black/30"
              onClick={() => setShowConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 10 }}
                className="w-full max-w-sm mx-4 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] shadow-2xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-400/15 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-heading font-semibold text-[var(--text)]">确认删除</h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">视频及其分析结果将被永久删除</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => setShowConfirm(false)} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-heading text-[var(--text-muted)] hover:bg-[var(--muted)] transition-colors disabled:opacity-50">取消</button>
                  <button onClick={handleConfirmDelete} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-heading text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50">{deleting ? '删除中…' : '确认'}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
