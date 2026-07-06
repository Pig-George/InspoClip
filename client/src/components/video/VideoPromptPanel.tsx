import { useState } from 'react';
import { generateVideoOutput } from '@/lib/video-api';
import type { VideoPromptOutput, VideoPurpose } from '@/types/video';

const purposes: Array<[VideoPurpose, string]> = [['general','通用'],['video-generation','视频生成'],['frontend','前端实现'],['motion-design','AE / Figma'],['storyboard','分镜脚本'],['json','结构化 JSON']];

export function VideoPromptPanel({ videoId }: { videoId: string }) {
  const [purpose, setPurpose] = useState<VideoPurpose>('general');
  const [target, setTarget] = useState('');
  const [output, setOutput] = useState<VideoPromptOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const generate = async () => {
    setLoading(true); setError('');
    try { setOutput(await generateVideoOutput(videoId, purpose, target, 'zh')); }
    catch (value) { setError(value instanceof Error ? value.message : '生成失败'); }
    finally { setLoading(false); }
  };
  return <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
    <h2 className="font-heading text-lg">复刻输出</h2>
    <div className="mt-3 flex flex-wrap gap-2">{purposes.map(([value,label]) => <button key={value} onClick={() => { setPurpose(value); setOutput(null); }} className={`rounded-full px-3 py-1 text-sm ${purpose===value?'bg-[var(--accent)] text-white':'bg-[var(--muted)]'}`}>{label}</button>)}</div>
    {purpose !== 'general' && purpose !== 'json' && <input aria-label="目标平台" value={target} onChange={(event)=>setTarget(event.target.value)} placeholder="可选：Sora、React、After Effects…" className="mt-3 w-full rounded-lg border border-[var(--card-border)] bg-[var(--muted)] px-3 py-2" />}
    <button onClick={generate} disabled={loading} className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-white disabled:opacity-50">{loading?'生成中…':'生成输出'}</button>
    {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    {output && <div className="mt-4"><pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--muted)] p-4 text-sm">{output.content}</pre><button className="mt-2 text-sm text-[var(--accent)]" onClick={() => navigator.clipboard.writeText(output.content)}>复制</button></div>}
  </section>;
}
