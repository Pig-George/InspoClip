import { describe, expect, it, vi } from 'vitest';
import { inspectVideo, validateVideoMetadata, generateVideoThumbnail, ensureModelCompatibleVideo } from './media.js';

describe('video media validation', () => {
  it('parses ffprobe output and accepts a supported UI demo', async () => {
    const run = vi.fn().mockResolvedValue({ stdout: JSON.stringify({
      format: { duration: '32.5', format_name: 'mov,mp4,m4a,3gp,3g2,mj2' },
      streams: [{ codec_type: 'video', width: 1280, height: 720 }],
    }) });
    await expect(inspectVideo('demo.mp4', run)).resolves.toEqual({ durationMs: 32_500, width: 1280, height: 720, container: 'mp4' });
    expect(run).toHaveBeenCalledWith('ffprobe', expect.arrayContaining(['demo.mp4']));
  });

  it('falls back to packet timestamps when a browser-recorded webm has no container duration', async () => {
    const run = vi.fn()
      .mockResolvedValueOnce({ stdout: JSON.stringify({
        format: { duration: 'N/A', format_name: 'matroska,webm' },
        streams: [{ codec_type: 'video', width: 640, height: 360 }],
      }) })
      .mockResolvedValueOnce({ stdout: JSON.stringify({
        packets: [
          { pts_time: '0.000000', duration_time: '0.033000' },
          { pts_time: '2.467000', duration_time: '0.033000' },
        ],
      }) });

    await expect(inspectVideo('recording.webm', run)).resolves.toEqual({
      durationMs: 2500,
      width: 640,
      height: 360,
      container: 'webm',
    });
    expect(run).toHaveBeenCalledTimes(2);
    expect(run).toHaveBeenLastCalledWith('ffprobe', expect.arrayContaining(['packet=pts_time,dts_time,duration_time']));
  });

  it('falls back to frame timestamps when browser-recorded webm packets have no duration', async () => {
    const run = vi.fn()
      .mockResolvedValueOnce({ stdout: JSON.stringify({
        format: { duration: 'N/A', format_name: 'matroska,webm' },
        streams: [{ codec_type: 'video', width: 640, height: 360 }],
      }) })
      .mockResolvedValueOnce({ stdout: JSON.stringify({ packets: [] }) })
      .mockResolvedValueOnce({ stdout: JSON.stringify({
        frames: [
          { best_effort_timestamp_time: '0.000000', pkt_duration_time: '0.033000' },
          { best_effort_timestamp_time: '3.967000', pkt_duration_time: '0.033000' },
        ],
      }) });

    await expect(inspectVideo('recording.webm', run)).resolves.toEqual({
      durationMs: 4000,
      width: 640,
      height: 360,
      container: 'webm',
    });
    expect(run).toHaveBeenCalledTimes(3);
    expect(run).toHaveBeenLastCalledWith('ffprobe', expect.arrayContaining(['frame=best_effort_timestamp_time,pkt_pts_time,pts_time,pkt_duration_time']));
  });

  it('uses a caller-provided duration as the final fallback for metadata-less browser recordings', async () => {
    const run = vi.fn()
      .mockResolvedValueOnce({ stdout: JSON.stringify({
        format: { duration: 'N/A', format_name: 'matroska,webm' },
        streams: [{ codec_type: 'video', width: 640, height: 360 }],
      }) })
      .mockResolvedValueOnce({ stdout: JSON.stringify({ packets: [] }) })
      .mockResolvedValueOnce({ stdout: JSON.stringify({ frames: [] }) });

    await expect(inspectVideo('recording.webm', run, { fallbackDurationMs: 3210 })).resolves.toEqual({
      durationMs: 3210,
      width: 640,
      height: 360,
      container: 'webm',
    });
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

  it('transcodes browser-recorded webm into model-compatible mp4', async () => {
    const run = vi.fn().mockResolvedValue({ stdout: '' });
    await expect(ensureModelCompatibleVideo('recording.webm', 'recording.model.mp4', run)).resolves.toBe('recording.model.mp4');
    expect(run).toHaveBeenCalledWith('ffmpeg', [
      '-y',
      '-i', 'recording.webm',
      '-an',
      '-r', '30',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-movflags', '+faststart',
      'recording.model.mp4',
    ]);
  });

  it('pads a short browser-recorded webm to the recorded duration for model input', async () => {
    const run = vi.fn().mockResolvedValue({ stdout: '' });
    await expect(ensureModelCompatibleVideo('recording.webm', 'recording.model.mp4', run, { targetDurationMs: 10_000 })).resolves.toBe('recording.model.mp4');
    expect(run).toHaveBeenCalledWith('ffmpeg', [
      '-y',
      '-i', 'recording.webm',
      '-an',
      '-r', '30',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2,tpad=stop_mode=clone:stop_duration=10.000',
      '-t', '10.000',
      '-movflags', '+faststart',
      'recording.model.mp4',
    ]);
  });
});
