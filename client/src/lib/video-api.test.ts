import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateVideoOutput, uploadVideo } from './video-api';

describe('video API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('uploads video as multipart form data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ videoId: 'v', jobId: 'j', status: 'pending' }), { status: 202, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const file = new File(['video'], 'demo.mp4', { type: 'video/mp4' });
    await expect(uploadVideo(file, 'client', 'week-a', 4)).resolves.toMatchObject({ videoId: 'v' });
    const options = fetchMock.mock.calls[0][1];
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    expect((options.body as FormData).get('video')).toBe(file);
    expect((options.body as FormData).get('weekId')).toBe('week-a');
    expect((options.body as FormData).get('dayOfWeek')).toBe('4');
  });

  it('uses general as the default output purpose', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'p', purpose: 'general', contentEn: 'x', contentZh: 'y' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    await generateVideoOutput('v');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ purpose: 'general', force: false });
  });

  it('sends the force flag when regenerating output', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'p', purpose: 'general', contentEn: 'x', contentZh: 'y' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await generateVideoOutput('v', 'general', '', true);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ purpose: 'general', target: '', force: true });
  });

  it('surfaces the server error body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Video too long' }), { status: 400, headers: { 'Content-Type': 'application/json' } })));
    await expect(uploadVideo(new File(['x'], 'x.mp4'))).rejects.toThrow('Video too long');
  });
});
