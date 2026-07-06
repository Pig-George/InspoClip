import { Router, type RequestHandler } from 'express';
import path from 'node:path';
import { unlink } from 'node:fs/promises';
import type { Purpose, PurposeOptions } from '../ai/prompts.js';
import type { VideoAnalysis } from '../ai/types.js';
import { videoUpload } from '../middleware/video-upload.js';
import { generateVideoThumbnail, inspectVideo, type VideoMetadata } from '../video/media.js';
import { DrizzleVideoRepository, type VideoRepository, type VideoSource } from '../video/repository.js';
import { createVideoAiService, getVideoModelConfig } from '../services/video-ai.js';

const PURPOSES = new Set<Purpose>(['general', 'video-generation', 'frontend', 'motion-design', 'storyboard', 'json']);

export interface VideosRouterDependencies {
  repository: VideoRepository;
  upload: RequestHandler;
  inspect(filePath: string): Promise<VideoMetadata>;
  thumbnail(inputPath: string, outputPath: string): Promise<string>;
  removeFile(filePath: string): Promise<void>;
  getModelSettings(): Promise<{ model: string; fps: number }>;
  generateOutput(analysis: VideoAnalysis, purpose: Purpose, options: PurposeOptions): Promise<string>;
  videoRoot: string;
}

function safeStoredPath(root: string, storedPath: string): string {
  return path.join(root, path.basename(storedPath));
}

function optionalString(value: unknown, name: string, fallback = ''): string {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string' || value.trim().length > 100) throw new Error(`${name} must be a string of at most 100 characters`);
  return value.trim();
}

export function createVideosRouter(overrides: Partial<VideosRouterDependencies> = {}): Router {
  const videoRoot = overrides.videoRoot ?? process.env.VIDEO_UPLOAD_DIR ?? './videos';
  const deps: VideosRouterDependencies = {
    repository: overrides.repository ?? new DrizzleVideoRepository(),
    upload: overrides.upload ?? videoUpload.single('video'),
    inspect: overrides.inspect ?? inspectVideo,
    thumbnail: overrides.thumbnail ?? generateVideoThumbnail,
    removeFile: overrides.removeFile ?? (async (filePath) => { await unlink(filePath); }),
    getModelSettings: overrides.getModelSettings ?? (async () => {
      const config = await getVideoModelConfig();
      return { model: config.model, fps: config.fps };
    }),
    generateOutput: overrides.generateOutput ?? (async (analysis, purpose, options) => (await createVideoAiService()).generateVideoOutput(analysis, purpose, options)),
    videoRoot,
  };
  const router = Router();

  router.post('/', deps.upload, async (req, res) => {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No video file provided' }); return; }
    try {
      const metadata = await deps.inspect(file.path);
      const thumbnailPath = `${file.filename}.thumb.jpg`;
      const generatedThumbnail = await deps.thumbnail(file.path, safeStoredPath(videoRoot, thumbnailPath)).catch(() => null);
      const source: VideoSource = req.body?.source === 'extension' ? 'extension' : 'client';
      const video = await deps.repository.createVideo({
        filePath: file.filename, thumbnailPath: generatedThumbnail ? thumbnailPath : null,
        originalName: file.originalname, mimeType: file.mimetype, sizeBytes: file.size,
        durationMs: metadata.durationMs, width: metadata.width, height: metadata.height, source,
      });
      const settings = await deps.getModelSettings();
      const job = await deps.repository.createJob(video.id, settings.model, settings.fps);
      res.status(202).json({ videoId: video.id, jobId: job.id, status: job.status });
    } catch (error) {
      await deps.removeFile(file.path).catch(() => undefined);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Video upload failed' });
    }
  });

  router.get('/:id/content', async (req, res) => {
    const video = await deps.repository.getVideo(String(req.params.id));
    if (!video) { res.status(404).json({ error: 'Video not found' }); return; }
    res.sendFile(path.basename(video.filePath), { root: path.resolve(videoRoot) });
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
      const locale = optionalString(req.body?.locale, 'locale', 'zh');
      const cached = await deps.repository.getPromptOutput(videoId, purpose, target, locale);
      if (cached) { res.json(cached); return; }
      const analysis = await deps.repository.getAnalysis(videoId);
      if (!analysis) { res.status(409).json({ error: 'Video analysis is not completed' }); return; }
      const content = purpose === 'json'
        ? JSON.stringify(analysis.analysis, null, 2)
        : await deps.generateOutput(analysis.analysis, purpose, { target, locale });
      res.json(await deps.repository.savePromptOutput(videoId, purpose, target, locale, content));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'Prompt generation failed' });
    }
  });

  router.get('/:id/prompts', async (req, res) => {
    try {
      const purposeValue = req.query.purpose ?? 'general';
      if (typeof purposeValue !== 'string' || !PURPOSES.has(purposeValue as Purpose)) { res.status(400).json({ error: 'Unsupported prompt purpose' }); return; }
      const target = optionalString(req.query.target, 'target');
      const locale = optionalString(req.query.locale, 'locale', 'zh');
      const output = await deps.repository.getPromptOutput(String(req.params.id), purposeValue, target, locale);
      if (!output) { res.status(404).json({ error: 'Prompt output not found' }); return; }
      res.json(output);
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
    res.json({ video, job, analysis: analysis?.analysis ?? null });
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
