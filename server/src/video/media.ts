import { execFile } from 'node:child_process';

export interface VideoMetadata {
  durationMs: number;
  width: number;
  height: number;
  container: string;
}

export type CommandRunner = (command: string, args: string[]) => Promise<{ stdout: string }>;

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

export function validateVideoMetadata(metadata: VideoMetadata): VideoMetadata {
  if (!Number.isFinite(metadata.durationMs) || metadata.durationMs <= 0) throw new Error('Video must have a valid duration');
  if (metadata.durationMs > 120_000) throw new Error('Video must be at most 120 seconds');
  if (!Number.isInteger(metadata.width) || !Number.isInteger(metadata.height) || metadata.width <= 0 || metadata.height <= 0) {
    throw new Error('Invalid video dimensions');
  }
  if (!['mp4', 'webm'].includes(metadata.container)) throw new Error('Unsupported video container');
  return metadata;
}

export async function inspectVideo(filePath: string, run: CommandRunner = defaultRunner): Promise<VideoMetadata> {
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
  const metadata: VideoMetadata = {
    durationMs: Math.round(Number(parsed.format?.duration) * 1000),
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
