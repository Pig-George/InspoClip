import { describe, expect, it, vi } from 'vitest';
import { inspectVideo, validateVideoMetadata, generateVideoThumbnail } from './media.js';

describe('video media validation', () => {
  it('parses ffprobe output and accepts a supported UI demo', async () => {
    const run = vi.fn().mockResolvedValue({ stdout: JSON.stringify({
      format: { duration: '32.5', format_name: 'mov,mp4,m4a,3gp,3g2,mj2' },
      streams: [{ codec_type: 'video', width: 1280, height: 720 }],
    }) });
    await expect(inspectVideo('demo.mp4', run)).resolves.toEqual({ durationMs: 32_500, width: 1280, height: 720, container: 'mp4' });
    expect(run).toHaveBeenCalledWith('ffprobe', expect.arrayContaining(['demo.mp4']));
  });

  it.each([
    [{ durationMs: 0, width: 1, height: 1, container: 'mp4' }, 'valid duration'],
    [{ durationMs: Number.NaN, width: 1, height: 1, container: 'mp4' }, 'valid duration'],
    [{ durationMs: 120_001, width: 1, height: 1, container: 'mp4' }, 'at most 120 seconds'],
    [{ durationMs: 10_000, width: 0, height: 1, container: 'mp4' }, 'dimensions'],
    [{ durationMs: 10_000, width: 1, height: 1, container: 'matroska' }, 'Unsupported'],
  ])('rejects invalid metadata %#', (metadata, message) => {
    expect(() => validateVideoMetadata(metadata)).toThrow(message);
  });

  it('accepts short UI demo videos under 10 seconds', () => {
    expect(validateVideoMetadata({ durationMs: 5_000, width: 1280, height: 720, container: 'mp4' }))
      .toEqual({ durationMs: 5_000, width: 1280, height: 720, container: 'mp4' });
  });

  it('rejects ffprobe output without a video stream', async () => {
    const run = vi.fn().mockResolvedValue({ stdout: JSON.stringify({ format: { duration: '30', format_name: 'mp4' }, streams: [] }) });
    await expect(inspectVideo('audio.mp4', run)).rejects.toThrow('video stream');
  });

  it('generates a thumbnail without shell string interpolation', async () => {
    const run = vi.fn().mockResolvedValue({ stdout: '' });
    await expect(generateVideoThumbnail('input file.mp4', 'thumb.jpg', run)).resolves.toBe('thumb.jpg');
    expect(run).toHaveBeenCalledWith('ffmpeg', ['-y', '-ss', '00:00:01', '-i', 'input file.mp4', '-frames:v', '1', '-vf', 'scale=640:-2', 'thumb.jpg']);
  });
});
