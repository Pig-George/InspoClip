import { useEffect, useRef, useState } from 'react';
import { fetchVideo, fetchVideoJob, retryVideo, videoContentUrl } from '@/lib/video-api';
import type { VideoDetail, VideoJob, VideoStage } from '@/types/video';
import { VideoJobProgress } from './VideoJobProgress';
import { VideoTimeline } from './VideoTimeline';
import { VideoPromptPanel } from './VideoPromptPanel';

export function VideoAnalysisView({ videoId, initialJobId, onBack }: { videoId: string; initialJobId?: string; onBack: () => void }) {
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [job, setJob] = useState<VideoJob | null>(null);
  const [error, setError] = useState('');
  const player = useRef<HTMLVideoElement>(null);
  const load = async () => { const value = await fetchVideo(videoId); setDetail(value); setJob(value.job); };
  useEffect(() => { let cancelled=false; let timer:number|undefined; const poll=async()=>{try{const current=initialJobId?await fetchVideoJob(initialJobId):(await fetchVideo(videoId)).job;if(cancelled)return;if(current)setJob(current);if(current?.status==='completed'){await load();return;}if(current?.status!=='failed')timer=window.setTimeout(poll,1500);}catch(value){if(!cancelled)setError(value instanceof Error?value.message:'加载失败');}}; load().then(poll).catch((value)=>setError(value.message)); return()=>{cancelled=true;if(timer)clearTimeout(timer);}; },[videoId,initialJobId]);
  const selectStage=(stage:VideoStage)=>{if(player.current){player.current.currentTime=stage.startTime;void player.current.play();}};
  return <main className="mx-auto min-h-screen max-w-6xl p-6"><button onClick={onBack} className="mb-4 text-[var(--accent)]">← 返回灵感库</button><h1 className="text-2xl font-heading">视频动效分析</h1>
    {error&&<p className="mt-4 text-red-500">{error}</p>}
    {job&&job.status!=='completed'&&<div className="mt-4"><VideoJobProgress job={job} onRetry={async()=>setJob(await retryVideo(videoId))}/></div>}
    <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_1fr]"><video ref={player} className="w-full rounded-2xl bg-black" controls src={videoContentUrl(videoId)} /><div>{detail?.analysis?<><h2 className="mb-3 text-lg font-heading">{detail.analysis.summary}</h2><VideoTimeline stages={detail.analysis.stages} onSelect={selectStage}/></>:<p className="text-[var(--text-muted)]">分析完成后将在此显示阶段时间线。</p>}</div></div>
    {detail?.analysis&&<div className="mt-6"><VideoPromptPanel videoId={videoId}/></div>}
  </main>;
}
