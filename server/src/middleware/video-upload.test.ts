import { describe, expect, it } from 'vitest';
import { getSupportedVideoMimeType } from './video-upload.js';

describe('video upload middleware', () => {
  it('accepts valid video mime types with parameters', () => {
    expect(getSupportedVideoMimeType('video/webm;codecs=vp9')).toBe('video/webm');
    expect(getSupportedVideoMimeType(' video/webm; codecs=vp8 ')).toBe('video/webm');
  });

  it('rejects unsupported video mime types', () => {
    expect(getSupportedVideoMimeType('application/octet-stream')).toBeNull();
    expect(getSupportedVideoMimeType('')).toBeNull();
  });
});
