import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ImageUploader } from './ImageUploader';
import { uploadVideo } from '@/lib/video-api';

vi.mock('@/lib/video-api', () => ({
  uploadVideo: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  uploadImage: vi.fn(),
  batchUploadImages: vi.fn(),
  checkSimilarity: vi.fn(),
}));

vi.mock('@/components/Toast', () => ({
  toast: vi.fn(),
}));

describe('ImageUploader', () => {
  it('consumes video paste events so the global paste handler does not upload the same video again', async () => {
    vi.mocked(uploadVideo).mockResolvedValue({ videoId: 'video-a', jobId: 'job-a', status: 'pending' });
    const documentPaste = vi.fn();
    document.addEventListener('paste', documentPaste);
    const onOpenVideo = vi.fn();
    const { container } = render(
      <ImageUploader weekId="week-a" dayOfWeek={2} onUploaded={() => undefined} onOpenVideo={onOpenVideo} />,
    );
    const dropZone = container.querySelector('[tabindex="0"]');
    const video = new File(['demo'], 'demo.mp4', { type: 'video/mp4' });

    fireEvent.paste(dropZone as Element, {
      clipboardData: {
        items: [{ type: 'video/mp4', getAsFile: () => video }],
      },
    });

    await waitFor(() => expect(uploadVideo).toHaveBeenCalledTimes(1));
    expect(uploadVideo).toHaveBeenCalledWith(video, 'client', 'week-a', 2);
    expect(onOpenVideo).toHaveBeenCalledWith('video-a', 'job-a');
    expect(documentPaste).not.toHaveBeenCalled();

    document.removeEventListener('paste', documentPaste);
  });
});
