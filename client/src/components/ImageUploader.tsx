import { useState, useCallback, useRef } from 'react';
import { WorkspaceUploadSurface } from '@inspoclip/workspace-ui';
import { Upload } from 'lucide-react';
import { uploadImage, batchUploadImages, checkSimilarity } from '@/lib/api';
import { setLastUploadedImageId } from '@/lib/events';
import { toast } from '@/components/Toast';
import { useLanguage } from '@/context/LanguageContext';
import { SimilarityConfirmDialog } from './SimilarityConfirmDialog';
import type { SimilarImage } from '@/lib/api';
import { uploadVideo } from '@/lib/video-api';

interface ImageUploaderProps {
  weekId: string;
  dayOfWeek: number;
  onUploaded: () => void;
  onOpenVideo: (videoId: string, jobId?: string) => void;
}

export function ImageUploader({ weekId, dayOfWeek, onUploaded, onOpenVideo }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [similarImages, setSimilarImages] = useState<SimilarImage[]>([]);
  const pendingFilesRef = useRef<File[]>([]);
  const { t, locale } = useLanguage();

  const doUpload = useCallback(
    async (files: File[]) => {
      setUploading(true);

      try {
        if (files.length === 1) {
          const result = await uploadImage(files[0], weekId, dayOfWeek);
          if (result?.id) setLastUploadedImageId(result.id);
        } else {
          setProgress({ current: 0, total: files.length });
          const results = await batchUploadImages(files, weekId, dayOfWeek, (current, total) => {
            setProgress({ current, total });
          });
          if (results.length > 0) {
            setLastUploadedImageId(results[results.length - 1].id);
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

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const videoFile = Array.from(files).find((f) => f.type.startsWith('video/'));
      if (videoFile) {
        setUploading(true);
        try {
          const result = await uploadVideo(videoFile, 'client', weekId, dayOfWeek);
          onUploaded();
          onOpenVideo(result.videoId, result.jobId);
        } catch (err: any) {
          toast('error', `视频上传失败: ${err?.message || err}`);
        } finally {
          setUploading(false);
        }
        return;
      }
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      // Only check similarity for single file uploads (batch is too expensive)
      if (imageFiles.length === 1) {
        setChecking(true);
        try {
          const similar = await checkSimilarity(imageFiles[0]);
          if (similar.length > 0) {
            pendingFilesRef.current = imageFiles;
            setSimilarImages(similar);
            setConfirmOpen(true);
            setChecking(false);
            return;
          }
        } catch {
          // If check fails, proceed with upload anyway
        }
        setChecking(false);
      }

      doUpload(imageFiles);
    },
    [doUpload, weekId, dayOfWeek, onUploaded, onOpenVideo]
  );

  const handleConfirm = useCallback(() => {
    setConfirmOpen(false);
    setSimilarImages([]);
    const files = pendingFilesRef.current;
    pendingFilesRef.current = [];
    if (files.length > 0) doUpload(files);
  }, [doUpload]);

  const handleCancel = useCallback(() => {
    setConfirmOpen(false);
    setSimilarImages([]);
    pendingFilesRef.current = [];
  }, []);

  const isBatch = progress.total > 1;
  const isBusy = uploading || checking;

  return (
    <>
      <WorkspaceUploadSurface
        label={t('PasteOrDrop')}
        busyLabel={checking ? (locale === 'zh' ? '检测相似图片中...' : 'Checking for duplicates...') : t('Analyzing')}
        busy={isBusy}
        progress={isBatch ? progress : undefined}
        onFiles={handleFiles}
        icon={<Upload />}
      />

      <SimilarityConfirmDialog
        open={confirmOpen}
        similarImages={similarImages}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}
