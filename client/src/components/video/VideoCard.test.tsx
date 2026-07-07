import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VideoCard } from './VideoCard';

describe('VideoCard', () => {
  it('shows metadata and opens the analysis when clicked', () => {
    const onOpen = vi.fn();
    render(<VideoCard video={{
      id: 'video-a', weekId: 'week-a', dayOfWeek: 1, sortOrder: 0,
      filePath: 'video.mp4', thumbnailPath: 'video.thumb.jpg', originalName: 'Demo.mp4',
      mimeType: 'video/mp4', sizeBytes: 100, durationMs: 65_000, width: 1280, height: 720,
      source: 'client', createdAt: new Date().toISOString(),
      job: { id: 'job-a', videoId: 'video-a', status: 'processing', progress: 40, model: 'qwen3.7-plus', fps: 3, attemptCount: 1, errorMessage: null },
    }} onOpen={onOpen} onRefresh={() => undefined} />);

    expect(screen.getByText('Demo.mp4')).toBeInTheDocument();
    expect(screen.getByText('01:05')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Demo.mp4/ }));
    expect(onOpen).toHaveBeenCalledWith('video-a', 'job-a');
  });

  it('uses the same scrapbook styling as image cards with a stable tilt and decoration', () => {
    render(<VideoCard video={{
      id: 'video-a', weekId: 'week-a', dayOfWeek: 1, sortOrder: 0,
      filePath: 'video.mp4', thumbnailPath: null, originalName: 'Demo.mp4',
      mimeType: 'video/mp4', sizeBytes: 100, durationMs: 5_000, width: 1280, height: 720,
      source: 'client', createdAt: new Date().toISOString(), job: null,
    }} onOpen={() => undefined} onRefresh={() => undefined} />);

    const card = screen.getByRole('button', { name: /Demo.mp4/ });
    expect(card).toHaveClass('polaroid');
    expect(card).toHaveStyle({ transform: 'rotate(1deg)' });
    expect(card.querySelector('[data-video-decoration]')).toBeInTheDocument();
  });
});
