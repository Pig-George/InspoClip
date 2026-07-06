import { describe, expect, it } from 'vitest';
import { InMemoryVideoRepository } from './repository.js';
import type { VideoAnalysis } from '../ai/types.js';

const analysis: VideoAnalysis = {
  summary: 'Dashboard interaction',
  visualStyle: { colors: ['#fff'], typography: 'sans', layout: 'grid', effects: ['fade'] },
  stages: [{
    startTime: 0,
    endTime: 1.2,
    title: 'Open panel',
    initialState: 'closed',
    trigger: 'click',
    actions: [{ subject: 'panel', action: 'slide in', from: {}, to: {}, durationMs: 300, delayMs: 0, easing: 'ease-out' }],
    resultState: 'open',
  }],
  assets: [],
  uncertainties: [],
};

describe('InMemoryVideoRepository', () => {
  it('creates a video and pending analysis job', async () => {
    const repo = new InMemoryVideoRepository();
    const video = await repo.createVideo({
      filePath: 'video.mp4', originalName: 'demo.mp4', mimeType: 'video/mp4',
      sizeBytes: 100, durationMs: 12_000, width: 1280, height: 720, source: 'client',
    });
    const job = await repo.createJob(video.id, 'qwen3.7-plus', 3);
    expect(job).toMatchObject({ videoId: video.id, status: 'pending', progress: 0, attemptCount: 0 });
  });

  it('claims each pending job only once', async () => {
    const repo = new InMemoryVideoRepository();
    const video = await repo.createVideo({ filePath: 'v.mp4', originalName: 'v.mp4', mimeType: 'video/mp4', sizeBytes: 1, durationMs: 10_000, width: 1, height: 1, source: 'client' });
    await repo.createJob(video.id, 'qwen3.7-plus', 3);
    expect((await repo.claimPendingJob())?.status).toBe('processing');
    expect(await repo.claimPendingJob()).toBeNull();
  });

  it('stores analysis and completes its job atomically', async () => {
    const repo = new InMemoryVideoRepository();
    const video = await repo.createVideo({ filePath: 'v.mp4', originalName: 'v.mp4', mimeType: 'video/mp4', sizeBytes: 1, durationMs: 10_000, width: 1, height: 1, source: 'client' });
    const job = await repo.createJob(video.id, 'qwen3.7-plus', 3);
    await repo.claimPendingJob();
    await repo.completeJob(job.id, analysis);
    expect(await repo.getAnalysis(video.id)).toMatchObject({ videoId: video.id, analysis, summary: analysis.summary });
    expect(await repo.getJob(job.id)).toMatchObject({ status: 'completed', progress: 100 });
  });

  it('recovers interrupted jobs and caches prompt outputs by compound key', async () => {
    const repo = new InMemoryVideoRepository();
    const video = await repo.createVideo({ filePath: 'v.mp4', originalName: 'v.mp4', mimeType: 'video/mp4', sizeBytes: 1, durationMs: 10_000, width: 1, height: 1, source: 'extension' });
    const job = await repo.createJob(video.id, 'qwen3.7-plus', 4);
    await repo.claimPendingJob();
    expect(await repo.recoverProcessingJobs()).toBe(1);
    expect(await repo.getJob(job.id)).toMatchObject({ status: 'pending' });
    await repo.claimPendingJob();
    await repo.completeJob(job.id, analysis);
    const saved = await repo.savePromptOutput(video.id, 'general', '', 'zh', 'content');
    const same = await repo.savePromptOutput(video.id, 'general', '', 'zh', 'replacement');
    expect(same.id).toBe(saved.id);
    expect((await repo.getPromptOutput(video.id, 'general', '', 'zh'))?.content).toBe('replacement');
  });
});
