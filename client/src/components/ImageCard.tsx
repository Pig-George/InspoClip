import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X, Check } from 'lucide-react';
import { DecorElement } from './DecorElement';
import { TermTag } from './TermTag';
import { deleteImage, imageUrl } from '@/lib/api';
import { consumeIfMatches } from '@/lib/events';
import { toast } from '@/components/Toast';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useLanguage } from '@/context/LanguageContext';
import type { Image as ImageType } from '@/types';

interface ImageCardProps {
  image: ImageType;
  onRefresh: () => void;
  animDelay?: number;
}

const MENU_W = 120;
const MENU_H = 36;

export function ImageCard({ image, onRefresh, animDelay = 0 }: ImageCardProps) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [detailCopiedId, setDetailCopiedId] = useState<string | null>(null);
  const detailCopyTimer = useRef<ReturnType<typeof setTimeout>>();
  const detailOverlayRef = useScrollLock(showDetail);
  const confirmOverlayRef = useScrollLock(showConfirm);
  const menuRef = useRef<HTMLDivElement>(null);
  const rawPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const { t } = useLanguage();

  const closeMenu = useCallback(() => setMenuPos(null), []);

  // Close menu on any click outside
  useEffect(() => {
    if (!menuPos) return;
    const handler = () => closeMenu();
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, [menuPos, closeMenu]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (detailCopyTimer.current) clearTimeout(detailCopyTimer.current); };
  }, []);

  // Auto-open detail modal for newly uploaded image (delay to let DOM settle)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (consumeIfMatches(image.id)) setShowDetail(true);
    }, 150);
    return () => clearTimeout(timer);
  }, [image.id]);

  // Close modals on Escape
  useEffect(() => {
    if (!showConfirm && !showDetail) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowConfirm(false);
        setShowDetail(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showConfirm, showDetail]);

  const handleDetailCopy = async (partId: string, text: string) => {
    try { await navigator.clipboard.writeText(text); } catch { /* fallback */ }
    setDetailCopiedId(partId);
    if (detailCopyTimer.current) clearTimeout(detailCopyTimer.current);
    detailCopyTimer.current = setTimeout(() => setDetailCopiedId(null), 1500);
  };

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

  // Refine position after menu renders
  useLayoutEffect(() => {
    if (!menuPos || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    let x = rawPosRef.current.x;
    let y = rawPosRef.current.y;

    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 4;
    if (x < 0) x = 4;
    if (y < 0) y = 4;

    if (x !== menuPos.x || y !== menuPos.y) {
      setMenuPos({ x, y });
    }
  }, [menuPos]);

  const handleDeleteClick = () => {
    closeMenu();
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteImage(image.id);
      onRefresh();
      toast('success', '图片已删除');
    } catch (err) {
      toast('error', '删除失败，请重试');
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, rotate: (image.decoration.length % 5) - 2 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.35 + (image.id.charCodeAt(0) % 10) * 0.04,
        delay: animDelay + (image.id.charCodeAt(1) % 8) * 0.05,
      }}
      className="polaroid relative inline-block w-full rounded-sm cursor-pointer group/card"
      onContextMenu={handleContextMenu}
      onClick={() => setShowDetail(true)}
    >
      {/* Decoration */}
      <DecorElement type={image.decoration} />

      {/* Image */}
      <div className="relative overflow-hidden rounded-sm aspect-[4/3] bg-gray-200">
        <img
          src={imageUrl(image.filePath)}
          alt="Design screenshot"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Terms */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-1">
        {image.terms.length > 0 && (
          <TermTag terms={image.terms} onRefresh={onRefresh} />
        )}
      </div>

      {/* Context menu — portaled to body */}
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
            <button
              onClick={handleDeleteClick}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors font-heading"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('DeleteImage')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body
      )}

      {/* Detail modal — portaled to body to escape Framer Motion transforms */}
      {createPortal(
        <AnimatePresence>
          {showDetail && (
            <motion.div
              ref={detailOverlayRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
              onClick={() => setShowDetail(false)}
            >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--card)]
                border border-[var(--card-border)] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)]">
                <h2 className="text-lg font-heading font-semibold text-[var(--text)]">
                  {t('ImageDetail')}
                </h2>
                <button
                  onClick={() => setShowDetail(false)}
                  className="p-1.5 rounded-full hover:bg-[var(--muted)] transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
              </div>

              {/* Image */}
              <div className="p-4">
                <div className="rounded-lg overflow-hidden bg-gray-200">
                  <img
                    src={imageUrl(image.filePath)}
                    alt="Design screenshot"
                    className="w-full h-auto max-h-[55vh] object-contain"
                  />
                </div>
              </div>

              {/* Terms */}
              <div className="px-6 pb-6">
                <div className="flex flex-wrap gap-2">
                  {image.terms.length > 0 ? (
                    image.terms.map((term) => {
                      const [en, zh] = (() => {
                        const idx = term.keyword.indexOf(' / ');
                        if (idx === -1) return [term.keyword, term.keyword] as [string, string];
                        return [term.keyword.slice(0, idx), term.keyword.slice(idx + 3)] as [string, string];
                      })();
                      const same = en === zh;
                      return (
                        <div
                          key={term.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm
                            bg-[var(--accent)]/10 text-[var(--accent)] font-term"
                        >
                          <button
                            onClick={() => handleDetailCopy(term.id + '-en', en)}
                            className="hover:underline cursor-pointer inline-flex items-center gap-0.5"
                          >
                            {detailCopiedId === term.id + '-en' && (
                              <Check className="w-3.5 h-3.5 text-green-500" />
                            )}
                            {en}
                          </button>
                          {!same && (
                            <>
                              <span className="opacity-40">/</span>
                              <button
                                onClick={() => handleDetailCopy(term.id + '-zh', zh)}
                                className="hover:underline cursor-pointer inline-flex items-center gap-0.5"
                              >
                                {detailCopiedId === term.id + '-zh' && (
                                  <Check className="w-3.5 h-3.5 text-green-500" />
                                )}
                                {zh}
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-sm text-[var(--text-muted)]">No terms</span>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body
      )}

      {/* Confirmation dialog — portaled to body */}
      {createPortal(
        <AnimatePresence>
          {showConfirm && (
            <motion.div
              ref={confirmOverlayRef}
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
                  <h3 className="text-base font-heading font-semibold text-[var(--text)]">
                    {t('ConfirmDelete')}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {t('ConfirmDeleteDesc')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg text-sm font-heading text-[var(--text-muted)]
                    hover:bg-[var(--muted)] transition-colors disabled:opacity-50"
                >
                  {t('Cancel')}
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg text-sm font-heading text-white
                    bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleting ? t('Saving') : t('Confirm')}
                </button>
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
