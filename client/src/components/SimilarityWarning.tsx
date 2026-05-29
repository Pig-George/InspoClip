import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { imageUrl } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';

interface SimilarImage {
  id: string;
  filePath: string;
}

interface SimilarityWarningProps {
  similarImages: SimilarImage[];
  onDismiss: () => void;
}

export function SimilarityWarning({ similarImages, onDismiss }: SimilarityWarningProps) {
  const { locale } = useLanguage();

  if (similarImages.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] max-w-md w-full mx-4
          bg-[var(--card)] border border-amber-400/50 rounded-xl shadow-xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-400/15 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-heading font-semibold text-[var(--text)]">
              {locale === 'zh' ? '发现相似图片' : 'Similar images found'}
            </h4>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {locale === 'zh'
                ? '你可能已经收集过类似的灵感'
                : 'You may have already collected similar inspiration'}
            </p>
            <div className="flex gap-2 mt-2">
              {similarImages.slice(0, 3).map((img) => (
                <div
                  key={img.id}
                  className="w-14 h-14 rounded-md overflow-hidden border border-[var(--card-border)]"
                >
                  <img src={imageUrl(img.filePath)} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-[var(--muted)]"
          >
            <X className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
