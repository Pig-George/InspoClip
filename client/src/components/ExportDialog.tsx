import { motion, AnimatePresence } from 'framer-motion';
import { FileJson, FileText, FolderDown, X } from 'lucide-react';
import { exportWeekUrl } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { useScrollLock } from '@/hooks/useScrollLock';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  weekDate: string;
}

export function ExportDialog({ open, onClose, weekDate }: ExportDialogProps) {
  const overlayRef = useScrollLock(open);
  const { locale } = useLanguage();

  const formats = [
    {
      key: 'zip' as const,
      icon: FolderDown,
      label: 'ZIP',
      desc: locale === 'zh' ? '图片 + 数据，完整备份' : 'Images + data, full backup',
    },
    {
      key: 'markdown' as const,
      icon: FileText,
      label: 'Markdown',
      desc: locale === 'zh' ? '内嵌图片的文档，适合 Notion' : 'Document with embedded images',
    },
    {
      key: 'json' as const,
      icon: FileJson,
      label: 'JSON',
      desc: locale === 'zh' ? '含 Base64 图片的结构化数据' : 'Structured data with Base64 images',
    },
  ];

  const handleExport = (format: 'zip' | 'json' | 'markdown') => {
    const url = exportWeekUrl(weekDate, format);
    window.open(url, '_blank');
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        data-dialog-overlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 10 }}
          className="w-full max-w-sm mx-4 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] shadow-2xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading font-semibold text-[var(--text)]">
              {locale === 'zh' ? '导出灵感' : 'Export Inspirations'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--muted)]">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          <div className="space-y-2">
            {formats.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => handleExport(f.key)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--card-border)]
                    hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="text-sm font-heading font-semibold text-[var(--text)]">{f.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{f.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
