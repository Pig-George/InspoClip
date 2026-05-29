import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import { uploadImage, batchUploadImages } from '@/lib/api';
import { setLastUploadedImageId } from '@/lib/events';
import { toast } from '@/components/Toast';
import { useLanguage } from '@/context/LanguageContext';
import { SimilarityWarning } from './SimilarityWarning';

interface ImageUploaderProps {
  weekId: string;
  dayOfWeek: number;
  onUploaded: () => void;
}

interface SimilarImage {
  id: string;
  filePath: string;
}

export function ImageUploader({ weekId, dayOfWeek, onUploaded }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const [similarImages, setSimilarImages] = useState<SimilarImage[]>([]);
  const { t, locale } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      setUploading(true);

      try {
        if (imageFiles.length === 1) {
          const result = await uploadImage(imageFiles[0], weekId, dayOfWeek);
          if (result?.id) setLastUploadedImageId(result.id);
          if (result?.similarImages?.length > 0) {
            setSimilarImages(result.similarImages);
          }
        } else {
          setProgress({ current: 0, total: imageFiles.length });
          const results = await batchUploadImages(imageFiles, weekId, dayOfWeek, (current, total) => {
            setProgress({ current, total });
          });
          if (results.length > 0) {
            setLastUploadedImageId(results[results.length - 1].id);
            const allSimilar = results.flatMap((r: any) => r.similarImages || []);
            if (allSimilar.length > 0) setSimilarImages(allSimilar.slice(0, 3));
          }
          toast('success', locale === 'zh'
            ? `成功导入 ${results.length} 张图片`
            : `Imported ${results.length} images`);
        }

        onUploaded();
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (msg.includes('413') || msg.includes('too large') || msg.includes('size')) {
          toast('error', '图片过大，请压缩后再试');
        } else if (msg.includes('Network') || msg.includes('fetch')) {
          toast('error', '网络错误，请检查连接');
        } else {
          toast('error', `上传失败: ${msg}`);
        }
      } finally {
        setUploading(false);
        setProgress({ current: 0, total: 0 });
      }
    },
    [weekId, dayOfWeek, onUploaded, locale]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) handleFiles(files);
    },
    [handleFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer?.files;
      if (files?.length > 0) handleFiles(files);
    },
    [handleFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files?.length > 0) handleFiles(files);
    e.target.value = '';
  };

  const isBatch = progress.total > 1;

  return (
    <>
      <div
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all
          ${dragOver ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-[var(--card-border)] hover:border-[var(--accent)]/50'}
        `}
        tabIndex={0}
      >
        <label className="cursor-pointer flex flex-col items-center gap-1.5">
          {uploading ? (
            isBatch ? (
              <>
                <div className="w-full h-1 bg-[var(--muted)] rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[var(--accent)] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-xs text-[var(--text-muted)] font-handwriting">
                  {locale === 'zh' ? `上传中 ${progress.current}/${progress.total}` : `Uploading ${progress.current}/${progress.total}`}
                </span>
              </>
            ) : (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full"
                />
                <span className="text-xs text-[var(--text-muted)] font-handwriting">
                  {t('Analyzing')}
                </span>
              </>
            )
          ) : (
            <>
              <Upload className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)] font-handwriting">
                {t('PasteOrDrop')}
              </span>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleInputChange}
            className="hidden"
          />
        </label>
      </div>

      {similarImages.length > 0 && (
        <SimilarityWarning
          similarImages={similarImages}
          onDismiss={() => setSimilarImages([])}
        />
      )}
    </>
  );
}
