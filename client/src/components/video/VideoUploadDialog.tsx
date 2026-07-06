import { useEffect, useState } from 'react';
import { uploadVideo } from '@/lib/video-api';

const MAX_BYTES = 200 * 1024 * 1024;
export function VideoUploadDialog({ open, onClose, onUploaded }: { open: boolean; onClose: () => void; onUploaded: (videoId: string, jobId: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  useEffect(() => { if (!file) { setUrl(''); return; } const value = URL.createObjectURL(file); setUrl(value); return () => URL.revokeObjectURL(value); }, [file]);
  if (!open) return null;
  const submit = async () => {
    if (!file) return;
    if (file.size > MAX_BYTES) { setError('视频不能超过 200MB'); return; }
    if (duration !== null && (duration < 10 || duration > 120)) { setError('视频时长需为 10 秒至 2 分钟'); return; }
    setUploading(true); setError('');
    try { const result = await uploadVideo(file); onUploaded(result.videoId, result.jobId); }
    catch (value) { setError(value instanceof Error ? value.message : '上传失败'); }
    finally { setUploading(false); }
  };
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}><div className="w-full max-w-lg rounded-2xl bg-[var(--card)] p-6" onClick={(event)=>event.stopPropagation()}>
    <h2 className="text-xl font-heading">分析 UI 动效视频</h2><p className="mt-1 text-sm text-[var(--text-muted)]">支持 MP4、MOV、WebM，10 秒至 2 分钟，最大 200MB。</p>
    <input className="mt-4 block w-full" type="file" accept="video/mp4,video/quicktime,video/webm" onChange={(event)=>{setFile(event.target.files?.[0]??null);setDuration(null);setError('');}} />
    {url && <video className="mt-4 max-h-64 w-full rounded-xl bg-black" src={url} controls onLoadedMetadata={(event)=>setDuration(event.currentTarget.duration)} />}
    {file && <p className="mt-2 text-sm">{file.name} · {(file.size/1024/1024).toFixed(1)}MB {duration!==null?`· ${duration.toFixed(1)}s`:''}</p>}
    {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    <div className="mt-5 flex justify-end gap-2"><button onClick={onClose} className="rounded-lg px-4 py-2">取消</button><button disabled={!file||uploading} onClick={submit} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-white disabled:opacity-50">{uploading?'上传中…':'开始分析'}</button></div>
  </div></div>;
}
