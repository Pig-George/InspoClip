import { randomUUID } from 'node:crypto';
import type { LocalizedString, VideoAnalysis } from '../ai/types.js';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { videoAnalyses, videoAnalysisJobs, videoPromptOutputs, videos } from '../db/schema.js';

export type VideoSource = 'client' | 'extension';
export type VideoJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface CreateVideoInput {
  weekId?: string | null;
  dayOfWeek?: number | null;
  sortOrder?: number;
  filePath: string;
  thumbnailPath?: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  width: number;
  height: number;
  source: VideoSource;
}

export interface VideoRecord extends Omit<CreateVideoInput, 'weekId' | 'dayOfWeek' | 'sortOrder'> {
  id: string;
  weekId: string | null;
  dayOfWeek: number | null;
  sortOrder: number;
  thumbnailPath: string | null;
  createdAt: Date;
}

export interface VideoWithJob extends VideoRecord { job: VideoJobRecord | null }

export interface VideoJobRecord {
  id: string;
  videoId: string;
  status: VideoJobStatus;
  progress: number;
  model: string;
  fps: number;
  attemptCount: number;
  errorMessage: string | null;
  rawResponse: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface VideoAnalysisRecord {
  id: string;
  videoId: string;
  summary: string;
  visualStyle: VideoAnalysis['visualStyle'];
  analysis: VideoAnalysis;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoPromptOutputRecord {
  id: string;
  analysisId: string;
  purpose: string;
  target: string;
  locale: string;
  content: string;
  createdAt: Date;
}

function localizedSummary(value: LocalizedString): string {
  return typeof value === 'string' ? value : value.zh || value.en;
}

export interface VideoRepository {
  createVideo(input: CreateVideoInput): Promise<VideoRecord>;
  getVideo(id: string): Promise<VideoRecord | null>;
  listVideosForWeek(weekId: string): Promise<VideoWithJob[]>;
  createJob(videoId: string, model: string, fps: number): Promise<VideoJobRecord>;
  getJob(id: string): Promise<VideoJobRecord | null>;
  getLatestJobForVideo(videoId: string): Promise<VideoJobRecord | null>;
  claimPendingJob(): Promise<VideoJobRecord | null>;
  completeJob(jobId: string, analysis: VideoAnalysis, rawResponse?: string): Promise<void>;
  failJob(jobId: string, errorMessage: string, rawResponse?: string): Promise<void>;
  retryJob(jobId: string): Promise<VideoJobRecord | null>;
  recoverProcessingJobs(): Promise<number>;
  getAnalysis(videoId: string): Promise<VideoAnalysisRecord | null>;
  savePromptOutput(videoId: string, purpose: string, target: string, locale: string, content: string): Promise<VideoPromptOutputRecord>;
  getPromptOutput(videoId: string, purpose: string, target: string, locale: string): Promise<VideoPromptOutputRecord | null>;
  deleteVideo(id: string): Promise<VideoRecord | null>;
}

export class InMemoryVideoRepository implements VideoRepository {
  private videos = new Map<string, VideoRecord>();
  private jobs = new Map<string, VideoJobRecord>();
  private analyses = new Map<string, VideoAnalysisRecord>();
  private outputs = new Map<string, VideoPromptOutputRecord>();

  async createVideo(input: CreateVideoInput): Promise<VideoRecord> {
    const record: VideoRecord = {
      ...input, id: randomUUID(), weekId: input.weekId ?? null, dayOfWeek: input.dayOfWeek ?? null,
      sortOrder: input.sortOrder ?? 0, thumbnailPath: input.thumbnailPath ?? null, createdAt: new Date(),
    };
    this.videos.set(record.id, record);
    return record;
  }

  async getVideo(id: string): Promise<VideoRecord | null> { return this.videos.get(id) ?? null; }
  async listVideosForWeek(weekId: string): Promise<VideoWithJob[]> {
    return Promise.all([...this.videos.values()]
      .filter((video) => video.weekId === weekId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime())
      .map(async (video) => ({ ...video, job: await this.getLatestJobForVideo(video.id) })));
  }

  async createJob(videoId: string, model: string, fps: number): Promise<VideoJobRecord> {
    if (!this.videos.has(videoId)) throw new Error('Video not found');
    const record: VideoJobRecord = {
      id: randomUUID(), videoId, status: 'pending', progress: 0, model, fps,
      attemptCount: 0, errorMessage: null, rawResponse: null,
      startedAt: null, completedAt: null, createdAt: new Date(),
    };
    this.jobs.set(record.id, record);
    return record;
  }

  async getJob(id: string): Promise<VideoJobRecord | null> { return this.jobs.get(id) ?? null; }
  async getLatestJobForVideo(videoId: string): Promise<VideoJobRecord | null> {
    return [...this.jobs.values()].filter((job) => job.videoId === videoId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
  }

  async claimPendingJob(): Promise<VideoJobRecord | null> {
    const record = [...this.jobs.values()].find((job) => job.status === 'pending');
    if (!record) return null;
    record.status = 'processing';
    record.progress = 10;
    record.startedAt = new Date();
    record.attemptCount += 1;
    return { ...record };
  }

  async completeJob(jobId: string, analysis: VideoAnalysis, rawResponse?: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'processing') throw new Error('Processing job not found');
    const now = new Date();
    this.analyses.set(job.videoId, {
      id: this.analyses.get(job.videoId)?.id ?? randomUUID(), videoId: job.videoId,
      summary: localizedSummary(analysis.summary), visualStyle: analysis.visualStyle, analysis,
      createdAt: this.analyses.get(job.videoId)?.createdAt ?? now, updatedAt: now,
    });
    Object.assign(job, { status: 'completed', progress: 100, completedAt: now, rawResponse: rawResponse ?? null, errorMessage: null });
  }

  async failJob(jobId: string, errorMessage: string, rawResponse?: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');
    Object.assign(job, { status: 'failed', errorMessage, rawResponse: rawResponse ?? null, completedAt: new Date() });
  }

  async retryJob(jobId: string): Promise<VideoJobRecord | null> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'failed') return null;
    Object.assign(job, { status: 'pending', progress: 0, errorMessage: null, rawResponse: null, startedAt: null, completedAt: null });
    return { ...job };
  }

  async recoverProcessingJobs(): Promise<number> {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'processing') {
        Object.assign(job, { status: 'pending', progress: 0, startedAt: null });
        count += 1;
      }
    }
    return count;
  }

  async getAnalysis(videoId: string): Promise<VideoAnalysisRecord | null> { return this.analyses.get(videoId) ?? null; }

  private outputKey(analysisId: string, purpose: string, target: string, locale: string) {
    return `${analysisId}\0${purpose}\0${target}\0${locale}`;
  }

  async savePromptOutput(videoId: string, purpose: string, target: string, locale: string, content: string): Promise<VideoPromptOutputRecord> {
    const analysis = this.analyses.get(videoId);
    if (!analysis) throw new Error('Analysis not found');
    const key = this.outputKey(analysis.id, purpose, target, locale);
    const previous = this.outputs.get(key);
    const record: VideoPromptOutputRecord = previous
      ? { ...previous, content }
      : { id: randomUUID(), analysisId: analysis.id, purpose, target, locale, content, createdAt: new Date() };
    this.outputs.set(key, record);
    return record;
  }

  async getPromptOutput(videoId: string, purpose: string, target: string, locale: string): Promise<VideoPromptOutputRecord | null> {
    const analysis = this.analyses.get(videoId);
    if (!analysis) return null;
    return this.outputs.get(this.outputKey(analysis.id, purpose, target, locale)) ?? null;
  }

  async deleteVideo(id: string): Promise<VideoRecord | null> {
    const video = this.videos.get(id) ?? null;
    if (!video) return null;
    this.videos.delete(id);
    this.analyses.delete(id);
    for (const [jobId, job] of this.jobs) if (job.videoId === id) this.jobs.delete(jobId);
    return video;
  }
}

export class DrizzleVideoRepository implements VideoRepository {
  constructor(private readonly database: typeof db = db) {}

  async createVideo(input: CreateVideoInput): Promise<VideoRecord> {
    const [record] = await this.database.insert(videos).values(input).returning();
    return record as VideoRecord;
  }

  async getVideo(id: string): Promise<VideoRecord | null> {
    const [record] = await this.database.select().from(videos).where(eq(videos.id, id)).limit(1);
    return (record as VideoRecord | undefined) ?? null;
  }

  async listVideosForWeek(weekId: string): Promise<VideoWithJob[]> {
    const records = await this.database.select().from(videos)
      .where(eq(videos.weekId, weekId)).orderBy(asc(videos.sortOrder), asc(videos.createdAt));
    return Promise.all(records.map(async (record) => ({
      ...(record as VideoRecord), job: await this.getLatestJobForVideo(record.id),
    })));
  }

  async createJob(videoId: string, model: string, fps: number): Promise<VideoJobRecord> {
    const [record] = await this.database.insert(videoAnalysisJobs).values({ videoId, model, fps }).returning();
    return record as VideoJobRecord;
  }

  async getJob(id: string): Promise<VideoJobRecord | null> {
    const [record] = await this.database.select().from(videoAnalysisJobs).where(eq(videoAnalysisJobs.id, id)).limit(1);
    return (record as VideoJobRecord | undefined) ?? null;
  }

  async getLatestJobForVideo(videoId: string): Promise<VideoJobRecord | null> {
    const [record] = await this.database.select().from(videoAnalysisJobs)
      .where(eq(videoAnalysisJobs.videoId, videoId)).orderBy(desc(videoAnalysisJobs.createdAt)).limit(1);
    return (record as VideoJobRecord | undefined) ?? null;
  }

  async claimPendingJob(): Promise<VideoJobRecord | null> {
    return this.database.transaction(async (tx) => {
      const [candidate] = await tx.select().from(videoAnalysisJobs)
        .where(eq(videoAnalysisJobs.status, 'pending')).orderBy(asc(videoAnalysisJobs.createdAt)).limit(1);
      if (!candidate) return null;
      const [claimed] = await tx.update(videoAnalysisJobs).set({
        status: 'processing', progress: 10, startedAt: new Date(),
        attemptCount: candidate.attemptCount + 1,
      }).where(and(eq(videoAnalysisJobs.id, candidate.id), eq(videoAnalysisJobs.status, 'pending'))).returning();
      return (claimed as VideoJobRecord | undefined) ?? null;
    });
  }

  async completeJob(jobId: string, analysis: VideoAnalysis, rawResponse?: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      const [job] = await tx.select().from(videoAnalysisJobs).where(eq(videoAnalysisJobs.id, jobId)).limit(1);
      if (!job || job.status !== 'processing') throw new Error('Processing job not found');
      await tx.insert(videoAnalyses).values({
        videoId: job.videoId, summary: localizedSummary(analysis.summary),
        visualStyle: analysis.visualStyle, analysis,
      }).onConflictDoUpdate({
        target: videoAnalyses.videoId,
        set: { summary: localizedSummary(analysis.summary), visualStyle: analysis.visualStyle, analysis, updatedAt: new Date() },
      });
      await tx.update(videoAnalysisJobs).set({
        status: 'completed', progress: 100, completedAt: new Date(),
        rawResponse: rawResponse ?? null, errorMessage: null,
      }).where(eq(videoAnalysisJobs.id, jobId));
    });
  }

  async failJob(jobId: string, errorMessage: string, rawResponse?: string): Promise<void> {
    await this.database.update(videoAnalysisJobs).set({
      status: 'failed', errorMessage, rawResponse: rawResponse ?? null, completedAt: new Date(),
    }).where(eq(videoAnalysisJobs.id, jobId));
  }

  async retryJob(jobId: string): Promise<VideoJobRecord | null> {
    const [record] = await this.database.update(videoAnalysisJobs).set({
      status: 'pending', progress: 0, errorMessage: null, rawResponse: null,
      startedAt: null, completedAt: null,
    }).where(and(eq(videoAnalysisJobs.id, jobId), eq(videoAnalysisJobs.status, 'failed'))).returning();
    return (record as VideoJobRecord | undefined) ?? null;
  }

  async recoverProcessingJobs(): Promise<number> {
    const records = await this.database.update(videoAnalysisJobs).set({
      status: 'pending', progress: 0, startedAt: null,
    }).where(eq(videoAnalysisJobs.status, 'processing')).returning({ id: videoAnalysisJobs.id });
    return records.length;
  }

  async getAnalysis(videoId: string): Promise<VideoAnalysisRecord | null> {
    const [record] = await this.database.select().from(videoAnalyses).where(eq(videoAnalyses.videoId, videoId)).limit(1);
    return (record as VideoAnalysisRecord | undefined) ?? null;
  }

  async savePromptOutput(videoId: string, purpose: string, target: string, locale: string, content: string): Promise<VideoPromptOutputRecord> {
    const analysis = await this.getAnalysis(videoId);
    if (!analysis) throw new Error('Analysis not found');
    const [record] = await this.database.insert(videoPromptOutputs).values({
      analysisId: analysis.id, purpose, target, locale, content,
    }).onConflictDoUpdate({
      target: [videoPromptOutputs.analysisId, videoPromptOutputs.purpose, videoPromptOutputs.target, videoPromptOutputs.locale],
      set: { content },
    }).returning();
    return record as VideoPromptOutputRecord;
  }

  async getPromptOutput(videoId: string, purpose: string, target: string, locale: string): Promise<VideoPromptOutputRecord | null> {
    const analysis = await this.getAnalysis(videoId);
    if (!analysis) return null;
    const [record] = await this.database.select().from(videoPromptOutputs).where(and(
      eq(videoPromptOutputs.analysisId, analysis.id), eq(videoPromptOutputs.purpose, purpose),
      eq(videoPromptOutputs.target, target), eq(videoPromptOutputs.locale, locale),
    )).limit(1);
    return (record as VideoPromptOutputRecord | undefined) ?? null;
  }

  async deleteVideo(id: string): Promise<VideoRecord | null> {
    const [record] = await this.database.delete(videos).where(eq(videos.id, id)).returning();
    return (record as VideoRecord | undefined) ?? null;
  }
}
