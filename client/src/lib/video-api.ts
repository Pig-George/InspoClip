import type { VideoAnalysis, VideoDetail, VideoJob, VideoPromptOutput, VideoPurpose, VideoUploadResult } from '@/types/video';

const BASE = '/api';

async function responseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: `HTTP ${response.status}` })) as { error?: string };
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function uploadVideo(file: File, source: 'client' | 'extension' = 'client', weekId?: string, dayOfWeek?: number): Promise<VideoUploadResult> {
  const form = new FormData();
  form.append('video', file);
  form.append('source', source);
  if (weekId) form.append('weekId', weekId);
  if (dayOfWeek !== undefined) form.append('dayOfWeek', String(dayOfWeek));
  return responseJson(await fetch(`${BASE}/videos`, { method: 'POST', body: form }));
}
export async function fetchVideo(id: string): Promise<VideoDetail> { return responseJson(await fetch(`${BASE}/videos/${id}`)); }
export async function fetchVideoJob(id: string): Promise<VideoJob> { return responseJson(await fetch(`${BASE}/video-jobs/${id}`)); }
export async function fetchVideoAnalysis(id: string): Promise<VideoAnalysis> { return responseJson(await fetch(`${BASE}/videos/${id}/analysis`)); }
export async function retryVideo(id: string): Promise<VideoJob> { return responseJson(await fetch(`${BASE}/videos/${id}/retry`, { method: 'POST' })); }
export async function deleteVideo(id: string): Promise<void> { await responseJson(await fetch(`${BASE}/videos/${id}`, { method: 'DELETE' })); }
export async function generateVideoOutput(id: string, purpose: VideoPurpose = 'general', target = '', locale = 'zh'): Promise<VideoPromptOutput> {
  return responseJson(await fetch(`${BASE}/videos/${id}/prompts`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose, target, locale }),
  }));
}
export function videoContentUrl(id: string): string { return `${BASE}/videos/${id}/content`; }
export function videoThumbnailUrl(id: string): string { return `${BASE}/videos/${id}/thumbnail`; }
