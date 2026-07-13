import { describe, expect, it } from 'vitest';

import { cleanupExpiredDraftVideos, draftCutoffDate } from './draft-cleanup.js';
import { InMemoryVideoRepository } from './repository.js';

describe('draft video cleanup', () => {
  it('computes the draft cleanup cutoff from ttl milliseconds', () => {
    expect(draftCutoffDate(new Date('2026-07-13T08:00:00.000Z'), 24 * 60 * 60 * 1000).toISOString())
      .toBe('2026-07-12T08:00:00.000Z');
  });

  it('removes only expired unsaved draft videos and their files', async () => {
    const repo = new InMemoryVideoRepository();
    const expiredDraft = await repo.createVideo({
      filePath: 'expired.mp4', thumbnailPath: 'expired.jpg', originalName: 'expired.mp4', mimeType: 'video/mp4',
      sizeBytes: 1, durationMs: 10_000, width: 1, height: 1, source: 'extension', isSaved: false,
    });
    const freshDraft = await repo.createVideo({
      filePath: 'fresh.mp4', thumbnailPath: 'fresh.jpg', originalName: 'fresh.mp4', mimeType: 'video/mp4',
      sizeBytes: 1, durationMs: 10_000, width: 1, height: 1, source: 'extension', isSaved: false,
    });
    const savedOldVideo = await repo.createVideo({
      filePath: 'saved.mp4', thumbnailPath: 'saved.jpg', originalName: 'saved.mp4', mimeType: 'video/mp4',
      sizeBytes: 1, durationMs: 10_000, width: 1, height: 1, source: 'extension', isSaved: true,
    });

    await repo.setVideoCreatedAtForTest(expiredDraft.id, new Date('2026-07-11T08:00:00.000Z'));
    await repo.setVideoCreatedAtForTest(freshDraft.id, new Date('2026-07-13T07:00:00.000Z'));
    await repo.setVideoCreatedAtForTest(savedOldVideo.id, new Date('2026-07-11T08:00:00.000Z'));

    const removedFiles: string[] = [];
    const result = await cleanupExpiredDraftVideos({
      repository: repo,
      cutoff: new Date('2026-07-12T08:00:00.000Z'),
      videoRoot: 'D:/videos',
      removeFile: async (filePath) => { removedFiles.push(filePath.replaceAll('\\', '/')); },
    });

    expect(result).toEqual({ deleted: 1, fileErrors: 0 });
    expect(await repo.getVideo(expiredDraft.id)).toBeNull();
    expect(await repo.getVideo(freshDraft.id)).not.toBeNull();
    expect(await repo.getVideo(savedOldVideo.id)).not.toBeNull();
    expect(removedFiles).toEqual([
      'D:/videos/expired.mp4',
      'D:/videos/expired.jpg',
    ]);
  });
});
