import type { VideoPromptOutput, VideoPurpose } from '@/types/video';

const inflight = new Map<string, Promise<VideoPromptOutput>>();

function key(videoId: string, purpose: VideoPurpose): string {
  return `${videoId}\0${purpose}`;
}

/**
 * Returns the in-flight generation promise for the given video and purpose,
 * or undefined if no generation is currently running.
 */
export function getInflight(videoId: string, purpose: VideoPurpose): Promise<VideoPromptOutput> | undefined {
  return inflight.get(key(videoId, purpose));
}

/**
 * Stores a generation promise so that reopening the dialog can reuse it
 * instead of triggering a duplicate request.
 */
export function setInflight(videoId: string, purpose: VideoPurpose, promise: Promise<VideoPromptOutput>): void {
  const k = key(videoId, purpose);
  inflight.set(k, promise);
  promise.finally(() => inflight.delete(k));
}
