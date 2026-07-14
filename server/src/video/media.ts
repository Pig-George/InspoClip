import { execFile } from 'node:child_process';

export interface VideoMetadata {
  durationMs: number;
  width: number;
  height: number;
  container: string;
}

export type CommandRunner = (command: string, args: string[]) => Promise<{ stdout: string }>;

export interface InspectVideoOptions {
  fallbackDurationMs?: number;
}

const defaultRunner: CommandRunner = (command, args) => new Promise((resolve, reject) => {
  execFile(command, args, { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }, (error, stdout) => {
    if (error) reject(error);
    else resolve({ stdout });
  });
});

function normalizeContainer(formatName: string): string {
  const names = formatName.toLowerCase().split(',');
  if (names.includes('webm')) return 'webm';
  if (names.includes('mp4') || names.includes('mov')) return 'mp4';
  return names[0] ?? '';
}

function durationMsFromSeconds(value: unknown): number {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds * 1000) : 0;
}

function durationMsFromTimedItems(
  items: Array<{
    pts_time?: string;
    dts_time?: string;
    duration_time?: string;
    best_effort_timestamp_time?: string;
    pkt_pts_time?: string;
    pkt_duration_time?: string;
  }> = [],
): number {
  const endTimes = items
    .map((packet) => {
      const timestamp = Number(packet.pts_time ?? packet.dts_time ?? packet.best_effort_timestamp_time ?? packet.pkt_pts_time);
      const duration = Number(packet.duration_time ?? packet.pkt_duration_time ?? 0);
      if (!Number.isFinite(timestamp) || timestamp < 0) return 0;
      return timestamp + (Number.isFinite(duration) && duration > 0 ? duration : 0);
    })
    .filter((value) => Number.isFinite(value) && value > 0);
  if (endTimes.length === 0) return 0;
  return Math.round(Math.max(...endTimes) * 1000);
}

function durationMsFromPackets(stdout: string): number {
  const parsed = JSON.parse(stdout) as {
    packets?: Array<{ pts_time?: string; dts_time?: string; duration_time?: string }>;
  };
  return durationMsFromTimedItems(parsed.packets);
}

function durationMsFromFrames(stdout: string): number {
  const parsed = JSON.parse(stdout) as {
    frames?: Array<{
      best_effort_timestamp_time?: string;
      pkt_pts_time?: string;
      pts_time?: string;
      pkt_duration_time?: string;
    }>;
  };
  return durationMsFromTimedItems(parsed.frames);
}

async function inspectPacketDuration(filePath: string, run: CommandRunner): Promise<number> {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'packet=pts_time,dts_time,duration_time',
    '-of', 'json', filePath,
  ]);
  return durationMsFromPackets(stdout);
}

async function inspectFrameDuration(filePath: string, run: CommandRunner): Promise<number> {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'frame=best_effort_timestamp_time,pkt_pts_time,pts_time,pkt_duration_time',
    '-of', 'json', filePath,
  ]);
  return durationMsFromFrames(stdout);
}

export function validateVideoMetadata(metadata: VideoMetadata): VideoMetadata {
  if (!Number.isFinite(metadata.durationMs) || metadata.durationMs <= 0) throw new Error('Video must have a valid duration');
  if (metadata.durationMs > 120_000) throw new Error('Video must be at most 120 seconds');
  if (!Number.isInteger(metadata.width) || !Number.isInteger(metadata.height) || metadata.width <= 0 || metadata.height <= 0) {
    throw new Error('Invalid video dimensions');
  }
  if (!['mp4', 'webm'].includes(metadata.container)) throw new Error('Unsupported video container');
  return metadata;
}

function normalizeFallbackDurationMs(value: unknown): number {
  const durationMs = Number(value);
  return Number.isFinite(durationMs) && durationMs > 0 ? Math.round(durationMs) : 0;
}

export async function inspectVideo(
  filePath: string,
  run: CommandRunner = defaultRunner,
  options: InspectVideoOptions = {},
): Promise<VideoMetadata> {
  const { stdout } = await run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration,format_name:stream=codec_type,width,height',
    '-of', 'json', filePath,
  ]);
  const parsed = JSON.parse(stdout) as {
    format?: { duration?: string; format_name?: string };
    streams?: Array<{ codec_type?: string; width?: number; height?: number }>;
  };
  const stream = parsed.streams?.find((item) => item.codec_type === 'video');
  if (!stream) throw new Error('Media has no video stream');
  const formatDurationMs = durationMsFromSeconds(parsed.format?.duration);
  const fallbackDurationMs = formatDurationMs
    || await inspectPacketDuration(filePath, run)
    || await inspectFrameDuration(filePath, run)
    || normalizeFallbackDurationMs(options.fallbackDurationMs);
  const metadata: VideoMetadata = {
    durationMs: fallbackDurationMs,
    width: stream.width ?? 0,
    height: stream.height ?? 0,
    container: normalizeContainer(parsed.format?.format_name ?? ''),
  };
  return validateVideoMetadata(metadata);
}

export async function generateVideoThumbnail(
  inputPath: string,
  outputPath: string,
  run: CommandRunner = defaultRunner,
): Promise<string> {
  await run('ffmpeg', ['-y', '-ss', '00:00:01', '-i', inputPath, '-frames:v', '1', '-vf', 'scale=640:-2', outputPath]);
  return outputPath;
}

export async function ensureModelCompatibleVideo(
  inputPath: string,
  outputPath: string,
  run: CommandRunner = defaultRunner,
): Promise<string> {
  await run('ffmpeg', [
    '-y',
    '-i', inputPath,
    '-an',
    '-r', '30',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-movflags', '+faststart',
    outputPath,
  ]);
  return outputPath;
}
