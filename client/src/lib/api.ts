import { WeekData, Tag, Week, Image } from '@/types';

const BASE = '/api';

export async function fetchWeek(dateStr: string): Promise<WeekData> {
  const res = await fetch(`${BASE}/weeks/${dateStr}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Failed to fetch week');
  }
  return res.json();
}

export interface SimilarImage {
  id: string;
  filePath: string;
}

export async function reorderImages(orders: { id: string; sortOrder: number }[]): Promise<void> {
  const res = await fetch(`${BASE}/images/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orders }),
  });
  if (!res.ok) throw new Error('Failed to reorder');
}

export async function checkSimilarity(file: File): Promise<SimilarImage[]> {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${BASE}/images/check-similarity`, { method: 'POST', body: form });
  if (!res.ok) return [];
  const data = await res.json();
  return data.similar || [];
}

export async function uploadImage(
  file: File,
  weekId: string,
  dayOfWeek: number
): Promise<any> {
  const form = new FormData();
  form.append('image', file);
  form.append('weekId', weekId);
  form.append('dayOfWeek', String(dayOfWeek));

  const res = await fetch(`${BASE}/images`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    if (res.status === 413) throw new Error('图片过大，超出上传限制');
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `上传失败 (${res.status})`);
  }
  return res.json();
}

export async function deleteImage(id: string): Promise<void> {
  const res = await fetch(`${BASE}/images/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Delete failed');
}

export async function deleteTerm(id: string): Promise<void> {
  const res = await fetch(`${BASE}/terms/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Delete failed');
}

export async function saveNotes(weekId: string, content: string): Promise<void> {
  const res = await fetch(`${BASE}/weeks/${weekId}/notes`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Save failed');
}

export function imageUrl(filePath: string): string {
  return `${BASE}/uploads/${filePath}`;
}

export function thumbnailUrl(thumbnailPath: string): string {
  return `${BASE}/uploads/${thumbnailPath}`;
}

export interface AIConfig {
  AI_PROVIDER?: string;
  AI_API_KEY?: string;
  AI_API_BASE?: string;
  AI_MODEL?: string;
}

export async function fetchConfig(): Promise<AIConfig> {
  const res = await fetch(`${BASE}/config`);
  if (!res.ok) throw new Error('Failed to fetch config');
  return res.json();
}

export async function updateConfig(updates: AIConfig): Promise<void> {
  const res = await fetch(`${BASE}/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update config');
}

export async function fetchTags(): Promise<Tag[]> {
  const res = await fetch(`${BASE}/tags`);
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}

export async function createTag(name: string, color?: string): Promise<Tag> {
  const res = await fetch(`${BASE}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) throw new Error('Failed to create tag');
  return res.json();
}

export async function deleteTag(id: string): Promise<void> {
  const res = await fetch(`${BASE}/tags/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete tag');
}

export async function addTagToImage(imageId: string, tagId: string): Promise<void> {
  const res = await fetch(`${BASE}/tags/image/${imageId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tagId }),
  });
  if (!res.ok) throw new Error('Failed to add tag');
}

export async function removeTagFromImage(imageId: string, tagId: string): Promise<void> {
  const res = await fetch(`${BASE}/tags/image/${imageId}/${tagId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to remove tag');
}

export async function batchUploadImages(
  files: File[],
  weekId: string,
  dayOfWeek: number,
  onProgress?: (current: number, total: number) => void
): Promise<any[]> {
  const batchSize = 3;
  const results: any[] = [];

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((file) => uploadImage(file, weekId, dayOfWeek))
    );
    results.push(...batchResults);
    onProgress?.(Math.min(i + batchSize, files.length), files.length);
  }

  return results;
}

export interface DesignPrompt {
  id: string;
  imageId: string;
  contentEn: string;
  contentZh: string;
}

export interface TimelineMonth {
  month: string;
  weeks: { week: Week; images: Image[] }[];
}

export async function fetchMonth(yearMonth: string): Promise<TimelineMonth> {
  const res = await fetch(`${BASE}/weeks/month/${yearMonth}`);
  if (!res.ok) throw new Error('Failed to fetch month');
  return res.json();
}

export function exportWeekUrl(dateStr: string, format: 'json' | 'markdown'): string {
  return `${BASE}/export/week/${dateStr}?format=${format}`;
}

export async function fetchDesignPrompt(imageId: string): Promise<DesignPrompt | null> {
  const res = await fetch(`${BASE}/images/${imageId}/prompt`);
  if (!res.ok) return null;
  return res.json();
}

export async function generateDesignPrompt(imageId: string, force?: boolean): Promise<DesignPrompt> {
  const url = force ? `${BASE}/images/${imageId}/prompt?force=true` : `${BASE}/images/${imageId}/prompt`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to generate prompt');
  return res.json();
}
