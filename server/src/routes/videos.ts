import { Router, type RequestHandler } from 'express';
import path from 'node:path';
import { unlink } from 'node:fs/promises';
import type { Purpose, PurposeOptions } from '../ai/prompts.js';
import type { VideoAnalysis } from '../ai/types.js';
import { videoUpload } from '../middleware/video-upload.js';
import { generateVideoThumbnail, inspectVideo, type VideoMetadata } from '../video/media.js';
import { DrizzleVideoRepository, type VideoRepository, type VideoSource } from '../video/repository.js';
import { cardSummaryFromAnalysis } from '../video/summary.js';
import { createVideoAiService, getVideoModelConfig } from '../services/video-ai.js';
import { db } from '../db/index.js';
import { weeks, videoTags, tags as tagsTable } from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';

const PURPOSES = new Set<Purpose>(['general', 'video-generation', 'frontend', 'motion-design', 'storyboard', 'json']);

export interface VideosRouterDependencies {
  repository: VideoRepository;
  upload: RequestHandler;
  inspect(filePath: string, options?: { fallbackDurationMs?: number }): Promise<VideoMetadata>;
  thumbnail(inputPath: string, outputPath: string): Promise<string>;
  removeFile(filePath: string): Promise<void>;
  getModelSettings(): Promise<{ model: string; fps: number }>;
  generateOutput(analysis: VideoAnalysis, purpose: Purpose, options: PurposeOptions): Promise<{ en: string; zh: string }>;
  videoRoot: string;
  resolvePlacement(): Promise<{ weekId: string; dayOfWeek: number }>;
}

const WEEKDAY_TO_DAY_OF_WEEK: Record<string, number> = {
  Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
};

export function getLocalWeekPlacement(date: Date, timeZone = process.env.APP_TIME_ZONE || process.env.TZ || 'Asia/Shanghai'): { weekStart: string; dayOfWeek: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  const year = Number(value('year'));
  const month = Number(value('month'));
  const day = Number(value('day'));
  const dayOfWeek = WEEKDAY_TO_DAY_OF_WEEK[String(value('weekday'))];
  const localDate = new Date(Date.UTC(year, month - 1, day));
  localDate.setUTCDate(localDate.getUTCDate() - dayOfWeek);
  return { weekStart: localDate.toISOString().slice(0, 10), dayOfWeek };
}

async function resolveTodayPlacement(): Promise<{ weekId: string; dayOfWeek: number }> {
  const placement = getLocalWeekPlacement(new Date());
  let [week] = await db.select().from(weeks).where(eq(weeks.weekStart, placement.weekStart)).limit(1);
  if (!week) [week] = await db.insert(weeks).values({ weekStart: placement.weekStart }).returning();
  return { weekId: week.id, dayOfWeek: placement.dayOfWeek };
}

function safeStoredPath(root: string, storedPath: string): string {
  return path.join(root, path.basename(storedPath));
}

function optionalString(value: unknown, name: string, fallback = ''): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string' || value.trim().length > 100) throw new Error(`${name} must be a string of at most 100 characters`);
  return value.trim();
}

function optionalPositiveNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? Math.round(numberValue) : undefined;
}

export function createVideosRouter(overrides: Partial<VideosRouterDependencies> = {}): Router {
  const videoRoot = overrides.videoRoot ?? process.env.VIDEO_UPLOAD_DIR ?? './videos';
  const deps: VideosRouterDependencies = {
    repository: overrides.repository ?? new DrizzleVideoRepository(),
    upload: overrides.upload ?? videoUpload.single('video'),
    inspect: overrides.inspect ?? ((filePath, options) => inspectVideo(filePath, undefined, options)),
    thumbnail: overrides.thumbnail ?? generateVideoThumbnail,
    removeFile: overrides.removeFile ?? (async (filePath) => { await unlink(filePath); }),
    getModelSettings: overrides.getModelSettings ?? (async () => {
      const config = await getVideoModelConfig();
      return { model: config.model, fps: config.fps };
    }),
    generateOutput: overrides.generateOutput ?? (async (analysis, purpose, options) => (await createVideoAiService()).generateVideoOutput(analysis, purpose, options)),
    videoRoot,
    resolvePlacement: overrides.resolvePlacement ?? resolveTodayPlacement,
  };
  const router = Router();

  // Track in-flight prompt generations so GET can report "generating" status
  const inflightGenerations = new Map<string, Promise<{ en: string; zh: string }>>();
  const generationKey = (videoId: string, purpose: string, target: string) => `${videoId}\0${purpose}\0${target}`;

  router.post('/', deps.upload, async (req, res) => {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No video file provided' }); return; }
    try {
      const metadata = await deps.inspect(file.path, { fallbackDurationMs: optionalPositiveNumber(req.body?.durationMs) });
      const thumbnailPath = `${file.filename}.thumb.jpg`;
      const generatedThumbnail = await deps.thumbnail(file.path, safeStoredPath(videoRoot, thumbnailPath)).catch(() => null);
      const source: VideoSource = req.body?.source === 'extension' ? 'extension' : 'client';
      const isDraft = req.body?.draft === true || req.body?.draft === 'true';
      const requestedDay = Number(req.body?.dayOfWeek);
      const placement = typeof req.body?.weekId === 'string' && req.body.weekId && Number.isInteger(requestedDay) && requestedDay >= 0 && requestedDay <= 6
        ? { weekId: req.body.weekId, dayOfWeek: requestedDay }
        : await deps.resolvePlacement();
      const video = await deps.repository.createVideo({
        ...placement, sortOrder: 0,
        filePath: file.filename, thumbnailPath: generatedThumbnail ? thumbnailPath : null,
        originalName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size,
        durationMs: metadata.durationMs, width: metadata.width, height: metadata.height, source,
        isSaved: !isDraft,
      });
      const settings = await deps.getModelSettings();
      const job = await deps.repository.createJob(video.id, settings.model, settings.fps);
      res.status(202).json({ videoId: video.id, jobId: job.id, status: job.status });
    } catch (error) {
      await deps.removeFile(file.path).catch(() => undefined);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Video upload failed' });
    }
  });

  router.post('/:id/save', async (req, res) => {
    const video = await deps.repository.saveVideo(String(req.params.id));
    if (!video) { res.status(404).json({ error: 'Video not found' }); return; }
    res.json({ video });
  });

  router.get('/:id/content', async (req, res) => {
    const video = await deps.repository.getVideo(String(req.params.id));
    if (!video) { res.status(404).json({ error: 'Video not found' }); return; }
    res.sendFile(path.basename(video.filePath), { root: path.resolve(videoRoot) });
  });

  router.get('/:id/thumbnail', async (req, res) => {
    const video = await deps.repository.getVideo(String(req.params.id));
    if (!video?.thumbnailPath) { res.status(404).json({ error: 'Video thumbnail not found' }); return; }
    res.sendFile(path.basename(video.thumbnailPath), { root: path.resolve(videoRoot) });
  });

  router.get('/:id/analysis', async (req, res) => {
    const analysis = await deps.repository.getAnalysis(String(req.params.id));
    if (!analysis) { res.status(404).json({ error: 'Video analysis not found' }); return; }
    res.json(analysis.analysis);
  });

  router.post('/:id/prompts', async (req, res) => {
    try {
      const videoId = String(req.params.id);
      const purposeValue = req.body?.purpose ?? 'general';
      if (typeof purposeValue !== 'string' || !PURPOSES.has(purposeValue as Purpose)) {
        res.status(400).json({ error: 'Unsupported prompt purpose' }); return;
      }
      const purpose = purposeValue as Purpose;
      const target = optionalString(req.body?.target, 'target');
      const cached = await deps.repository.getPromptOutput(videoId, purpose, target);
      if (cached) { res.json(cached); return; }
      const analysis = await deps.repository.getAnalysis(videoId);
      if (!analysis) { res.status(409).json({ error: 'Video analysis is not completed' }); return; }
      const key = generationKey(videoId, purpose, target);
      const existing = inflightGenerations.get(key);
      if (existing) {
        const content = await existing;
        const saved = await deps.repository.getPromptOutput(videoId, purpose, target)
          ?? await deps.repository.savePromptOutput(videoId, purpose, target, content.en, content.zh);
        res.json(saved);
        return;
      }
      const promise = (async () => {
        return purpose === 'json'
          ? { en: JSON.stringify(analysis.analysis, null, 2), zh: JSON.stringify(analysis.analysis, null, 2) }
          : await deps.generateOutput(analysis.analysis, purpose, { target });
      })();
      inflightGenerations.set(key, promise);
      promise.catch(() => {}).finally(() => inflightGenerations.delete(key));
      const content = await promise;
      res.json(await deps.repository.savePromptOutput(videoId, purpose, target, content.en, content.zh));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Prompt generation failed' });
    }
  });

  router.get('/:id/prompts', async (req, res) => {
    try {
      const purposeValue = req.query.purpose ?? 'general';
      if (typeof purposeValue !== 'string' || !PURPOSES.has(purposeValue as Purpose)) { res.status(400).json({ error: 'Unsupported prompt purpose' }); return; }
      const target = optionalString(req.query.target, 'target');
      const videoId = String(req.params.id);
      const output = await deps.repository.getPromptOutput(videoId, purposeValue, target);
      if (output) { res.json(output); return; }
      if (inflightGenerations.has(generationKey(videoId, purposeValue, target))) {
        res.status(202).json({ generating: true });
        return;
      }
      res.status(404).json({ error: 'Prompt output not found' });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid request' });
    }
  });

  router.post('/:id/retry', async (req, res) => {
    const job = await deps.repository.getLatestJobForVideo(String(req.params.id));
    if (!job) { res.status(404).json({ error: 'Video analysis job not found' }); return; }
    const retried = await deps.repository.retryJob(job.id);
    if (!retried) { res.status(409).json({ error: 'Only failed jobs can be retried' }); return; }
    res.json(retried);
  });

  router.get('/:id', async (req, res) => {
    const id = String(req.params.id);
    const video = await deps.repository.getVideo(id);
    if (!video) { res.status(404).json({ error: 'Video not found' }); return; }
    const [job, analysis] = await Promise.all([deps.repository.getLatestJobForVideo(id), deps.repository.getAnalysis(id)]);
    const videoTagRows = await db
      .select({ tagId: tagsTable.id, tagName: tagsTable.name, tagColor: tagsTable.color })
      .from(videoTags)
      .innerJoin(tagsTable, eq(videoTags.tagId, tagsTable.id))
      .where(eq(videoTags.videoId, id));
    res.json({
      video, job,
      analysis: analysis?.analysis ?? null,
      summary: cardSummaryFromAnalysis(analysis),
      tags: videoTagRows.map((t) => ({ id: t.tagId, name: t.tagName, color: t.tagColor })),
    });
  });

  router.delete('/:id', async (req, res) => {
    const video = await deps.repository.deleteVideo(String(req.params.id));
    if (video) {
      await deps.removeFile(safeStoredPath(videoRoot, video.filePath)).catch(() => undefined);
      if (video.thumbnailPath) await deps.removeFile(safeStoredPath(videoRoot, video.thumbnailPath)).catch(() => undefined);
    }
    res.json({ success: true });
  });

  return router;
}

export default createVideosRouter();
