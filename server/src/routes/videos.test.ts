import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createVideosRouter, getLocalWeekPlacement } from './videos.js';
import { createVideoJobsRouter } from './video-jobs.js';
import { InMemoryVideoRepository } from '../video/repository.js';
import type { VideoAnalysis } from '../ai/types.js';

const analysis: VideoAnalysis = {
  summary: 'demo', visualStyle: { colors: [], typography: '', layout: '', effects: [] },
  stages: [{ startTime: 0, endTime: 1, title: 'stage', initialState: 'a', trigger: 'click', actions: [], resultState: 'b' }],
  assets: [], uncertainties: [],
};

function setup() {
  const repo = new InMemoryVideoRepository();
  const upload: RequestHandler = (req, _res, next) => {
    req.file = { path: 'C:/videos/demo.mp4', filename: 'demo.mp4', originalname: 'Demo.mp4', mimetype: 'video/mp4', size: 123 } as Express.Multer.File;
    next();
  };
  const removeFile = vi.fn().mockResolvedValue(undefined);
  const inspect = vi.fn().mockResolvedValue({ durationMs: 20_000, width: 1280, height: 720, container: 'mp4' });
  const app = express();
  app.use(express.json());
  app.use('/api/videos', createVideosRouter({
    repository: repo,
    upload,
    inspect,
    thumbnail: vi.fn().mockResolvedValue('demo.thumb.jpg'),
    removeFile,
    getModelSettings: async () => ({ model: 'qwen3.7-plus', fps: 3 }),
    generateOutput: async (_value, purpose) => ({ en: `${purpose}: en`, zh: `${purpose}: zh` }),
    videoRoot: 'C:/videos',
    resolvePlacement: async () => ({ weekId: 'week-today', dayOfWeek: 0 }),
  }));
  app.use('/api/video-jobs', createVideoJobsRouter(repo));
  return { app, repo, removeFile, inspect };
}

describe('video routes', () => {
  it('resolves default placement with the configured business timezone', () => {
    expect(getLocalWeekPlacement(new Date('2026-07-06T17:00:00.000Z'), 'Asia/Shanghai')).toEqual({
      weekStart: '2026-07-06',
      dayOfWeek: 1,
    });
  });

  it('uploads a video and creates a pending job', async () => {
    const { app, repo } = setup();
    const response = await request(app).post('/api/videos').send({ source: 'client', weekId: 'week-a', dayOfWeek: 4 });
    expect(response.status).toBe(202);
    expect(response.body).toMatchObject({ status: 'pending' });
    expect(await repo.getVideo(response.body.videoId)).toMatchObject({ durationMs: 20_000, source: 'client', weekId: 'week-a', dayOfWeek: 4 });
    expect(await repo.getJob(response.body.jobId)).toMatchObject({ model: 'qwen3.7-plus', fps: 3 });
  });

  it('passes extension-provided duration as an inspect fallback', async () => {
    const { app, inspect } = setup();
    const response = await request(app).post('/api/videos').send({ source: 'extension', durationMs: '4321' });
    expect(response.status).toBe(202);
    expect(inspect).toHaveBeenCalledWith('C:/videos/demo.mp4', { fallbackDurationMs: 4321 });
  });

  it('keeps draft uploads out of weekly lists until explicitly saved', async () => {
    const { app, repo } = setup();
    const uploaded = await request(app).post('/api/videos').send({ source: 'extension', draft: 'true' });
    expect(uploaded.status).toBe(202);
    expect(await repo.getVideo(uploaded.body.videoId)).toMatchObject({ source: 'extension', isSaved: false });
    await expect(repo.listVideosForWeek('week-today')).resolves.toEqual([]);

    const saved = await request(app).post(`/api/videos/${uploaded.body.videoId}/save`).send({});
    expect(saved.status).toBe(200);
    expect(saved.body.video).toMatchObject({ id: uploaded.body.videoId, isSaved: true });
    await expect(repo.listVideosForWeek('week-today')).resolves.toMatchObject([
      { id: uploaded.body.videoId, isSaved: true },
    ]);
  });

  it('returns job status and completed analysis', async () => {
    const { app, repo } = setup();
    const uploaded = await request(app).post('/api/videos').send({});
    const claimed = await repo.claimPendingJob();
    await repo.completeJob(claimed!.id, analysis);
    expect((await request(app).get(`/api/video-jobs/${uploaded.body.jobId}`)).body.status).toBe('completed');
    expect((await request(app).get(`/api/videos/${uploaded.body.videoId}/analysis`)).body.summary).toBe('demo');
  });

  it('generates and caches bilingual output by default', async () => {
    const { app, repo } = setup();
    const uploaded = await request(app).post('/api/videos').send({});
    const claimed = await repo.claimPendingJob();
    await repo.completeJob(claimed!.id, analysis);
    const generated = await request(app).post(`/api/videos/${uploaded.body.videoId}/prompts`).send({});
    expect(generated.status).toBe(200);
    expect(generated.body).toMatchObject({ purpose: 'general', contentEn: 'general: en', contentZh: 'general: zh' });
    const cached = await request(app).get(`/api/videos/${uploaded.body.videoId}/prompts?purpose=general`);
    expect(cached.body.id).toBe(generated.body.id);
  });

  it('retries failed jobs and deletes files idempotently', async () => {
    const { app, repo, removeFile } = setup();
    const uploaded = await request(app).post('/api/videos').send({});
    const job = await repo.claimPendingJob();
    await repo.failJob(job!.id, 'failed');
    expect((await request(app).post(`/api/videos/${uploaded.body.videoId}/retry`)).body.status).toBe('pending');
    expect((await request(app).delete(`/api/videos/${uploaded.body.videoId}`)).status).toBe(200);
    expect(removeFile).toHaveBeenCalled();
    expect((await request(app).delete(`/api/videos/${uploaded.body.videoId}`)).status).toBe(200);
  });

  it('rejects unsupported prompt purposes', async () => {
    const { app, repo } = setup();
    const uploaded = await request(app).post('/api/videos').send({});
    const job = await repo.claimPendingJob();
    await repo.completeJob(job!.id, analysis);
    expect((await request(app).post(`/api/videos/${uploaded.body.videoId}/prompts`).send({ purpose: 'evil' })).status).toBe(400);
  });
});
