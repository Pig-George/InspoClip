import { describe, expect, it } from 'vitest';
import type { ImageModelInput, ModelProvider, TextModelInput, VideoModelInput } from '../ai/provider.js';
import { AiService } from '../ai/service.js';
import { InMemoryVideoRepository } from './repository.js';
import { VideoWorker } from './worker.js';

const validAnalysis = {
  summary: 'UI demo',
  visualStyle: { colors: [], typography: 'sans', layout: 'grid', effects: [] },
  stages: [{ startTime: 0, endTime: 1, title: 'Open', initialState: 'closed', trigger: 'click', actions: [{ subject: 'panel', action: 'open', from: {}, to: {}, durationMs: 300, delayMs: 0, easing: 'ease' }], resultState: 'open' }],
  assets: [], uncertainties: [],
};

class FakeProvider implements ModelProvider {
  videoCalls: VideoModelInput[] = [];
  textCalls: TextModelInput[] = [];
  constructor(private videoResponses: Array<unknown | Error>, private textResponse: unknown = '') {}
  analyzeImage(_input: ImageModelInput): Promise<unknown> { throw new Error('unused'); }
  async analyzeVideo(input: VideoModelInput): Promise<unknown> {
    this.videoCalls.push(input);
    const response = this.videoResponses.shift();
    if (response instanceof Error) throw response;
    return response;
  }
  async generateText(input: TextModelInput): Promise<unknown> { this.textCalls.push(input); return this.textResponse; }
}

async function setup(provider: FakeProvider) {
  const repo = new InMemoryVideoRepository();
  const video = await repo.createVideo({ filePath: 'demo.mp4', originalName: 'demo.mp4', mimeType: 'video/mp4', sizeBytes: 1, durationMs: 10_000, width: 100, height: 100, source: 'client' });
  const job = await repo.createJob(video.id, 'qwen3.7-plus', 4);
  const waits: number[] = [];
  const checkedUrls: string[] = [];
  const worker = new VideoWorker(repo, new AiService(provider), {
    videoUrlFor: (record) => `http://localhost:3001/api/videos/${record.id}/content`,
    ensureVideoUrlAvailable: async (url) => { checkedUrls.push(url); },
    maxAttempts: 3, pollIntervalMs: 1, backoffBaseMs: 100, wait: async (ms) => { waits.push(ms); },
  });
  return { repo, video, job, worker, provider, waits, checkedUrls };
}

describe('VideoWorker', () => {
  it('analyzes a pending job and stores the result', async () => {
    const ctx = await setup(new FakeProvider([JSON.stringify(validAnalysis)]));
    expect(await ctx.worker.runOnce()).toBe(true);
    expect(await ctx.repo.getJob(ctx.job.id)).toMatchObject({ status: 'completed', progress: 100 });
    expect((await ctx.repo.getAnalysis(ctx.video.id))?.analysis.summary).toBe('UI demo');
    expect(ctx.provider.videoCalls[0]).toMatchObject({ fps: 4, videoUrl: expect.stringContaining(ctx.video.id) });
    expect(ctx.checkedUrls).toHaveLength(1);
  });

  it('preflights the public video URL before calling the model', async () => {
    const provider = new FakeProvider([JSON.stringify(validAnalysis)]);
    const repo = new InMemoryVideoRepository();
    const video = await repo.createVideo({ filePath: 'demo.mp4', originalName: 'demo.mp4', mimeType: 'video/mp4', sizeBytes: 1, durationMs: 10_000, width: 100, height: 100, source: 'client' });
    const job = await repo.createJob(video.id, 'qwen3.7-plus', 4);
    const error = Object.assign(new Error('public video URL is not reachable'), { status: 503 });
    const worker = new VideoWorker(repo, new AiService(provider), {
      videoUrlFor: () => 'https://tunnel.example/api/model-videos/demo/content?token=abc',
      ensureVideoUrlAvailable: async () => { throw error; },
      maxAttempts: 3,
      wait: async () => undefined,
    });

    await worker.runOnce();

    expect(provider.videoCalls).toHaveLength(0);
    expect(await repo.getJob(job.id)).toMatchObject({ status: 'pending', attemptCount: 1 });
  });

  it('repairs malformed JSON exactly once', async () => {
    const repaired = JSON.stringify(validAnalysis);
    const ctx = await setup(new FakeProvider(['not-json'], repaired));
    await ctx.worker.runOnce();
    expect(ctx.provider.textCalls).toHaveLength(1);
    expect(await ctx.repo.getJob(ctx.job.id)).toMatchObject({ status: 'completed' });
  });

  it('requeues transient failures below the attempt limit', async () => {
    const error = Object.assign(new Error('rate limited'), { status: 429 });
    const ctx = await setup(new FakeProvider([error]));
    await ctx.worker.runOnce();
    expect(await ctx.repo.getJob(ctx.job.id)).toMatchObject({ status: 'pending', attemptCount: 1 });
    expect(ctx.waits).toEqual([100]);
  });

  it('marks invalid model output as failed', async () => {
    const ctx = await setup(new FakeProvider(['bad'], 'still bad'));
    await ctx.worker.runOnce();
    expect(await ctx.repo.getJob(ctx.job.id)).toMatchObject({ status: 'failed' });
  });

  it('stores raw model output when video parsing fails', async () => {
    const error = Object.assign(new Error('Unterminated string in JSON at position 1030'), { rawResponse: '{"summary":"truncated' });
    const repo = new InMemoryVideoRepository();
    const video = await repo.createVideo({ filePath: 'demo.mp4', originalName: 'demo.mp4', mimeType: 'video/mp4', sizeBytes: 1, durationMs: 10_000, width: 100, height: 100, source: 'client' });
    const job = await repo.createJob(video.id, 'qwen3.7-plus', 4);
    const worker = new VideoWorker(repo, { analyzeVideo: async () => { throw error; } }, {
      videoUrlFor: () => 'https://tunnel.example/api/model-videos/demo/content?token=abc',
      ensureVideoUrlAvailable: async () => undefined,
    });

    await worker.runOnce();

    expect(await repo.getJob(job.id)).toMatchObject({
      status: 'failed',
      rawResponse: '{"summary":"truncated',
    });
  });

  it('recovers processing jobs before starting', async () => {
    const ctx = await setup(new FakeProvider([JSON.stringify(validAnalysis)]));
    await ctx.repo.claimPendingJob();
    expect(await ctx.worker.recover()).toBe(1);
    expect(await ctx.repo.getJob(ctx.job.id)).toMatchObject({ status: 'pending' });
  });
});
