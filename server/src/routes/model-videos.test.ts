import express from 'express';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createModelVideosRouter } from './model-videos.js';
import { InMemoryVideoRepository } from '../video/repository.js';
import { ModelVideoAccessTokens } from '../video/public-access.js';

describe('model video routes', () => {
  let tmpDir = '';

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'aimood-model-video-'));
  });

  afterEach(async () => {
    if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
  });

  async function setup() {
    const repo = new InMemoryVideoRepository();
    const tokens = new ModelVideoAccessTokens({ ttlMs: 60_000, now: () => 1_000 });
    await writeFile(path.join(tmpDir, 'demo.mp4'), 'video-bytes');
    const video = await repo.createVideo({
      filePath: 'demo.mp4', originalName: 'demo.mp4', mimeType: 'video/mp4',
      sizeBytes: 11, durationMs: 10_000, width: 100, height: 100, source: 'client',
    });
    const app = express();
    app.use('/api/model-videos', createModelVideosRouter({ repository: repo, tokens, videoRoot: tmpDir }));
    return { app, tokens, video };
  }

  it('rejects downloads without a valid temporary token', async () => {
    const { app, video } = await setup();

    expect((await request(app).get(`/api/model-videos/${video.id}/content`)).status).toBe(403);
    expect((await request(app).get(`/api/model-videos/${video.id}/content?token=bad`)).status).toBe(403);
  });

  it('serves video content with a valid temporary token', async () => {
    const { app, tokens, video } = await setup();
    const issued = tokens.issue(video.id);

    const response = await request(app).get(`/api/model-videos/${video.id}/content?token=${issued.token}`);

    expect(response.status).toBe(200);
    expect(response.body.toString()).toBe('video-bytes');
  });
});
