import type { VideoJob } from '@/types/video';

export function VideoJobProgress({ job, onRetry }: { job: VideoJob; onRetry?: () => void }) {
  const labels = { pending: '等待分析', processing: '正在理解视频', completed: '分析完成', failed: '分析失败' };
  return <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-4">
    <div className="flex justify-between text-sm"><span>{labels[job.status]}</span><span>{job.progress}%</span></div>
    <div className="mt-2 h-2 overflow-hidden rounded bg-[var(--muted)]"><div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${job.progress}%` }} /></div>
    {job.errorMessage && <p className="mt-2 text-sm text-red-500">{job.errorMessage}</p>}
    {job.status === 'failed' && onRetry && <button className="mt-3 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm text-white" onClick={onRetry}>重试</button>}
  </div>;
}
