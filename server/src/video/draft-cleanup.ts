import path from 'node:path';
import { unlink } from 'node:fs/promises';

import type { VideoRecord, VideoRepository } from './repository.js';

export interface DraftCleanupOptions {
  repository: VideoRepository;
  cutoff: Date;
  videoRoot?: string;
  removeFile?: (filePath: string) => Promise<void>;
}

export interface DraftCleanupResult {
  deleted: number;
  fileErrors: number;
}

export function draftCutoffDate(now: Date, ttlMs: number): Date {
  return new Date(now.getTime() - ttlMs);
}

export function resolveVideoAssetPath(videoRoot: string, storedPath: string): string {
  return path.join(videoRoot, path.basename(storedPath));
}

async function removeVideoFiles(
  video: VideoRecord,
  videoRoot: string,
  removeFile: (filePath: string) => Promise<void>,
): Promise<number> {
  let fileErrors = 0;
  const files = [video.filePath, video.thumbnailPath].filter((filePath): filePath is string => Boolean(filePath));
  for (const filePath of files) {
    try {
      await removeFile(resolveVideoAssetPath(videoRoot, filePath));
    } catch {
      fileErrors += 1;
    }
  }
  return fileErrors;
}

export async function cleanupExpiredDraftVideos(options: DraftCleanupOptions): Promise<DraftCleanupResult> {
  const videoRoot = options.videoRoot ?? process.env.VIDEO_UPLOAD_DIR ?? './videos';
  const removeFile = options.removeFile ?? (async (filePath: string) => { await unlink(filePath); });
  const drafts = await options.repository.listDraftVideosCreatedBefore(options.cutoff);
  let deleted = 0;
  let fileErrors = 0;

  for (const draft of drafts) {
    const deletedVideo = await options.repository.deleteVideo(draft.id);
    if (!deletedVideo) continue;
    deleted += 1;
    fileErrors += await removeVideoFiles(deletedVideo, videoRoot, removeFile);
  }

  return { deleted, fileErrors };
}

export interface DraftCleanupSchedulerOptions {
  repository: VideoRepository;
  ttlMs?: number;
  intervalMs?: number;
  videoRoot?: string;
  now?: () => Date;
  onResult?: (result: DraftCleanupResult) => void;
  onError?: (error: unknown) => void;
}

export function startDraftVideoCleanup(options: DraftCleanupSchedulerOptions): NodeJS.Timeout | null {
  const ttlMs = options.ttlMs ?? parseInt(process.env.VIDEO_DRAFT_TTL_MS || `${24 * 60 * 60 * 1000}`, 10);
  const intervalMs = options.intervalMs ?? parseInt(process.env.VIDEO_DRAFT_CLEANUP_INTERVAL_MS || `${60 * 60 * 1000}`, 10);
  if (!Number.isFinite(ttlMs) || ttlMs <= 0 || !Number.isFinite(intervalMs) || intervalMs <= 0) return null;

  const run = async () => {
    try {
      const result = await cleanupExpiredDraftVideos({
        repository: options.repository,
        cutoff: draftCutoffDate(options.now?.() ?? new Date(), ttlMs),
        videoRoot: options.videoRoot,
      });
      options.onResult?.(result);
    } catch (error) {
      options.onError?.(error);
    }
  };

  void run();
  return setInterval(() => { void run(); }, intervalMs);
}
