import { setTimeout as delay } from 'node:timers/promises';
import type { VideoAnalysis } from '../ai/types.js';
import type { VideoRecord, VideoRepository } from './repository.js';

export interface VideoWorkerOptions {
  videoUrlFor(video: VideoRecord): string | Promise<string>;
  ensureVideoUrlAvailable?(url: string): Promise<void>;
  releaseVideoUrl?(url: string, video: VideoRecord): Promise<void> | void;
  maxAttempts?: number;
  pollIntervalMs?: number;
  backoffBaseMs?: number;
  wait?(milliseconds: number): Promise<void>;
}

export interface VideoAiOperations {
  analyzeVideo(input: { videoUrl: string; fps?: number; minPixels?: number; maxPixels?: number }): Promise<{ analysis: VideoAnalysis; rawResponse: string }>;
}

function isTransient(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const value = error as { status?: unknown; code?: unknown };
  return value.status === 429
    || (typeof value.status === 'number' && value.status >= 500)
    || value.code === 'ETIMEDOUT'
    || value.code === 'ECONNRESET';
}

export class VideoWorker {
  private stopped = true;
  private readonly maxAttempts: number;
  private readonly pollIntervalMs: number;
  private readonly backoffBaseMs: number;
  private readonly wait: (milliseconds: number) => Promise<void>;

  constructor(
    private readonly repository: VideoRepository,
    private readonly aiService: VideoAiOperations,
    private readonly options: VideoWorkerOptions,
  ) {
    this.maxAttempts = options.maxAttempts ?? 3;
    this.pollIntervalMs = options.pollIntervalMs ?? 1_000;
    this.backoffBaseMs = options.backoffBaseMs ?? 1_000;
    this.wait = options.wait ?? (async (milliseconds) => { await delay(milliseconds); });
  }

  recover(): Promise<number> { return this.repository.recoverProcessingJobs(); }

  async runOnce(): Promise<boolean> {
    const job = await this.repository.claimPendingJob();
    if (!job) return false;
    let video: VideoRecord | null = null;
    let videoUrl: string | null = null;
    try {
      video = await this.repository.getVideo(job.videoId);
      if (!video) throw new Error('Video not found');
      videoUrl = await this.options.videoUrlFor(video);
      await this.options.ensureVideoUrlAvailable?.(videoUrl);
      const result = await this.aiService.analyzeVideo({
        videoUrl, fps: job.fps,
      });
      await this.repository.completeJob(job.id, result.analysis, result.rawResponse.slice(0, 100_000));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.repository.failJob(job.id, message.slice(0, 2_000));
      if (isTransient(error) && job.attemptCount < this.maxAttempts) {
        await this.wait(this.backoffBaseMs * 2 ** Math.max(0, job.attemptCount - 1));
        await this.repository.retryJob(job.id);
      }
    } finally {
      if (videoUrl && video) await this.options.releaseVideoUrl?.(videoUrl, video);
    }
    return true;
  }

  async start(): Promise<void> {
    if (!this.stopped) return;
    this.stopped = false;
    await this.recover();
    while (!this.stopped) {
      const worked = await this.runOnce();
      if (!worked) await delay(this.pollIntervalMs);
    }
  }

  stop(): void { this.stopped = true; }
}
