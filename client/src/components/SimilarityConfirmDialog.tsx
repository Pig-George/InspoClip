import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { imageUrl } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { useScrollLock } from '@/hooks/useScrollLock';
import type { SimilarImage } from '@/lib/api';

interface SimilarityConfirmDialogProps {
  open: boolean;
  similarImages: SimilarImage[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function SimilarityConfirmDialog({ open, similarImages, onConfirm, onCancel }: SimilarityConfirmDialogProps) {
  const overlayRef = useScrollLock(open);
  const { locale } = useLanguage();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          data-dialog-overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/40"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.9, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 10 }}
            className="w-full max-w-sm mx-4 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-400/15 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-base font-heading font-semibold text-[var(--text)]">
                  {locale === 'zh' ? '发现相似图片' : 'Similar images found'}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {locale === 'zh'
                    ? '你可能已经收集过类似的灵感，确定要继续上传吗？'
                    : 'You may have already collected similar inspiration. Continue uploading?'}
                </p>
              </div>
            </div>

            {/* Similar images preview */}
            <div className="flex gap-2 mb-5 justify-center">
              {similarImages.slice(0, 3).map((img) => (
                <div
                  key={img.id}
                  className="w-16 h-16 rounded-lg overflow-hidden border border-[var(--card-border)]"
                >
                  <img src={imageUrl(img.filePath)} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg text-sm font-heading text-[var(--text-muted)]
                  hover:bg-[var(--muted)] transition-colors"
              >
                {locale === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded-lg text-sm font-heading text-white
                  bg-[var(--accent)] hover:bg-[var(--accent)]/80 transition-colors"
              >
                {locale === 'zh' ? '继续上传' : 'Upload anyway'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
