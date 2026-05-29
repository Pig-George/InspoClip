import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import { batchUploadImages } from '@/lib/api';
import { toast } from '@/components/Toast';
import { useLanguage } from '@/context/LanguageContext';
import { setLastUploadedImageId } from '@/lib/events';

interface BatchUploaderProps {
  weekId: string;
  dayOfWeek: number;
  onUploaded: () => void;
}

export function BatchUploader({ weekId, dayOfWeek, onUploaded }: BatchUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { locale } = useLanguage();

  const handleFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setUploading(true);
    setProgress({ current: 0, total: imageFiles.length });

    try {
      const results = await batchUploadImages(imageFiles, weekId, dayOfWeek, (current, total) => {
        setProgress({ current, total });
      });

      if (results.length > 0) {
        setLastUploadedImageId(results[results.length - 1].id);
      }

      toast('success', locale === 'zh'
        ? `成功导入 ${results.length} 张图片`
        : `Imported ${results.length} images`);

      onUploaded();
    } catch (err: any) {
      toast('error', err.message || 'Batch upload failed');
    } finally {
      setUploading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed transition-colors ${
        dragOver
          ? 'border-[var(--accent)] bg-[var(--accent)]/5'
          : 'border-[var(--card-border)] hover:border-[var(--accent)]/50'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
      >
        <Upload className="w-4 h-4" />
        {uploading
          ? (locale === 'zh' ? `上传中 ${progress.current}/${progress.total}` : `Uploading ${progress.current}/${progress.total}`)
          : (locale === 'zh' ? '批量导入' : 'Batch import')
        }
      </button>

      {uploading && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--muted)] rounded-b-lg overflow-hidden">
          <motion.div
            className="h-full bg-[var(--accent)]"
            initial={{ width: 0 }}
            animate={{ width: `${(progress.current / progress.total) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </div>
  );
}
