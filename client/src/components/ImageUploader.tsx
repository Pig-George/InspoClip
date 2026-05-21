import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload } from 'lucide-react';
import { uploadImage } from '@/lib/api';
import { setLastUploadedImageId } from '@/lib/events';
import { toast } from '@/components/Toast';
import { useLanguage } from '@/context/LanguageContext';

interface ImageUploaderProps {
  weekId: string;
  dayOfWeek: number;
  onUploaded: () => void;
}

export function ImageUploader({ weekId, dayOfWeek, onUploaded }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { t } = useLanguage();

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return;
      setUploading(true);
      try {
        const result = await uploadImage(file, weekId, dayOfWeek);
        if (result?.id) setLastUploadedImageId(result.id);
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
      }
    },
    [weekId, dayOfWeek, onUploaded]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) handleFile(file);
        }
      }
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = e.dataTransfer?.files;
      if (files?.[0]) handleFile(files[0]);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
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
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full"
          />
        ) : (
          <Upload className="w-4 h-4 text-[var(--text-muted)]" />
        )}
        <span className="text-xs text-[var(--text-muted)] font-handwriting">
          {uploading ? t('Analyzing') : t('PasteOrDrop')}
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />
      </label>
    </div>
  );
}
