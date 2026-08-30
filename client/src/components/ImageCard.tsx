import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X, Check } from 'lucide-react';
import { TermTag } from './TermTag';
import { TagManager } from './TagManager';
import { ColorPalette } from './ColorPalette';
import { DesignPrompt } from './DesignPrompt';
import { deleteImage, imageUrl, thumbnailUrl } from '@/lib/api';
import { consumeIfMatches } from '@/lib/events';
import { toast } from '@/components/Toast';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useLanguage } from '@/context/LanguageContext';
import type { Image as ImageType } from '@/types';
import { WorkspaceAssetCard, WorkspaceBilingualTermList, WorkspaceConfirmDialog, WorkspaceDetailDialog, WorkspaceDetailSection, WorkspaceMediaPreview, type WorkspaceBilingualTerm } from '@inspoclip/workspace-ui';

interface ImageCardProps {
  image: ImageType;
  onRefresh: () => void;
  animDelay?: number;
}

const MENU_W = 120;
const MENU_H = 36;

function toBilingualTerm(id: string, keyword: string): WorkspaceBilingualTerm {
  const divider = keyword.indexOf(' / ');
  return divider === -1
    ? { id, en: keyword, zh: keyword }
    : { id, en: keyword.slice(0, divider), zh: keyword.slice(divider + 3) };
}

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
  const { t, locale } = useLanguage();

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

  // Confirmation dialogs are still owned by this card; detail dialogs handle Escape in the shared shell.
  useEffect(() => {
    if (!showConfirm && !showDetail) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showConfirm) setShowConfirm(false);
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
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.35 + (image.id.charCodeAt(0) % 10) * 0.04,
        delay: animDelay + (image.id.charCodeAt(1) % 8) * 0.05,
      }}
      className="contents"
    >
      <WorkspaceAssetCard
        kind="image"
        title={image.filePath || 'Design screenshot'}
        alt="Design screenshot"
        mediaSrc={image.thumbnailPath ? thumbnailUrl(image.thumbnailPath) : imageUrl(image.filePath)}
        decoration={image.decoration}
        rotation={(image.decoration.length % 5) - 2}
        termContent={<div data-testid="image-card-terms" className="workspace-card-term-overlay">{image.terms.length > 0 ? <TermTag terms={image.terms} onRefresh={onRefresh} /> : null}</div>}
        element="div"
        onClick={() => setShowDetail(true)}
        onContextMenu={handleContextMenu}
        ariaLabel={`打开图片详情 ${image.filePath || 'Design screenshot'}`}
      >

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
            <WorkspaceDetailDialog
              ref={detailOverlayRef}
              onDragOver={(e) => e.preventDefault()}
              title={t('ImageDetail')}
              closeLabel={locale === 'zh' ? '关闭' : 'Close'}
              onClose={() => setShowDetail(false)}
              closeButtonClassName="workspace-dialog-close"
              closeButton={<X />}
              media={<WorkspaceMediaPreview kind="image" src={imageUrl(image.filePath)} alt="Design screenshot" mediaClassName="workspace-detail-media" />}
            >
                <>
                  {/* Terms */}
                  <WorkspaceDetailSection title={locale === 'zh' ? '设计术语' : 'Design Terms'}>
                    <WorkspaceBilingualTermList
                      terms={image.terms.map((term) => toBilingualTerm(term.id, term.keyword))}
                      copiedId={detailCopiedId}
                      copiedIcon={<Check className="w-3 h-3 text-green-500" />}
                      emptyLabel={locale === 'zh' ? '暂无术语' : 'No terms'}
                      onCopy={handleDetailCopy}
                    />
                  </WorkspaceDetailSection>

                  {/* Tags */}
                  <WorkspaceDetailSection title={locale === 'zh' ? '标签' : 'Tags'}>
                    <TagManager
                      imageId={image.id}
                      imageTags={image.tags || []}
                      onTagsChange={onRefresh}
                    />
                  </WorkspaceDetailSection>

                  {/* Colors */}
                  {image.colors && image.colors.length > 0 && (
                    <WorkspaceDetailSection title={t('ColorPalette')}>
                      <ColorPalette colors={image.colors} />
                    </WorkspaceDetailSection>
                  )}

                  {/* AI Prompt */}
                  <WorkspaceDetailSection title="AI Prompt">
                    <DesignPrompt imageId={image.id} />
                  </WorkspaceDetailSection>
                </>
            </WorkspaceDetailDialog>
        )}
      </AnimatePresence>,
        document.body
      )}

      {/* Confirmation dialog — portaled to body */}
      {createPortal(
        <AnimatePresence>
          {showConfirm && (
            <WorkspaceConfirmDialog
              ref={confirmOverlayRef}
              title={t('ConfirmDelete')}
              description={t('ConfirmDeleteDesc')}
              cancelLabel={t('Cancel')}
              confirmLabel={deleting ? t('Saving') : t('Confirm')}
              icon={<AlertTriangle />}
              pending={deleting}
              onCancel={() => setShowConfirm(false)}
              onConfirm={handleConfirmDelete}
            />
          )}
      </AnimatePresence>,
        document.body
      )}
      </WorkspaceAssetCard>
    </motion.div>
  );
}
