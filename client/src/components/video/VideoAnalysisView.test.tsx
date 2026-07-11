import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VideoAnalysisView } from './VideoAnalysisView';
import { fetchVideo, fetchVideoJob, retryVideo } from '@/lib/video-api';

vi.mock('@/lib/video-api', () => ({
  fetchVideo: vi.fn(),
  fetchVideoJob: vi.fn(),
  retryVideo: vi.fn(),
  videoContentUrl: (id: string) => `/api/videos/${id}/content`,
}));

const detail = {
  video: {
    id: 'video-a',
    weekId: 'week-a',
    dayOfWeek: 1,
    sortOrder: 0,
    filePath: 'video.mp4',
    thumbnailPath: 'video.thumb.jpg',
    originalName: 'Demo.mp4',
    mimeType: 'video/mp4',
    sizeBytes: 100,
    durationMs: 5_000,
    width: 320,
    height: 240,
    source: 'client' as const,
    createdAt: new Date().toISOString(),
  },
  job: { id: 'job-a', videoId: 'video-a', status: 'completed' as const, progress: 100, model: 'qwen3.7-plus', fps: 3, attemptCount: 1, errorMessage: null },
  summary: 'A compact UI transition',
  tags: [],
  analysis: {
    summary: 'A compact UI transition',
    visualStyle: { colors: [], typography: '', layout: '', effects: [] },
    stages: [{
      startTime: 0,
      endTime: 1.2,
      title: 'Open panel',
      initialState: 'closed',
      trigger: 'tap',
      actions: [{ subject: 'panel', action: 'slides in', from: {}, to: {}, durationMs: 300, delayMs: 0, easing: 'ease-out' }],
      resultState: 'open',
    }],
    assets: [],
    uncertainties: [],
  },
};

describe('VideoAnalysisView', () => {
  it('renders video analysis in a modal with the same two-column detail layout as image detail', async () => {
    vi.mocked(fetchVideo).mockResolvedValue(detail);
    vi.mocked(fetchVideoJob).mockResolvedValue(detail.job);
    vi.mocked(retryVideo).mockResolvedValue(detail.job);
    const onBack = vi.fn();

    render(<VideoAnalysisView open videoId="video-a" initialJobId="job-a" onBack={onBack} />);

    const dialog = await screen.findByRole('dialog', { name: /视频动效分析|Video motion analysis/ });
    expect(dialog).toHaveClass('max-w-4xl');
    expect(dialog).toHaveClass('overflow-hidden');
    expect(screen.getByText('A compact UI transition')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open panel/ })).toBeInTheDocument();
    expect(document.querySelector('[data-dialog-overlay]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /关闭|Close/ }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('closes the modal with Escape', async () => {
    vi.mocked(fetchVideo).mockResolvedValue(detail);
    vi.mocked(fetchVideoJob).mockResolvedValue(detail.job);
    const onBack = vi.fn();

    render(<VideoAnalysisView open videoId="video-a" onBack={onBack} />);

    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1));
  });

  it('keeps the dialog mounted for the exit animation when open becomes false', async () => {
    vi.mocked(fetchVideo).mockResolvedValue(detail);
    vi.mocked(fetchVideoJob).mockResolvedValue(detail.job);
    const onBack = vi.fn();

    const { rerender } = render(<VideoAnalysisView open videoId="video-a" onBack={onBack} />);

    await screen.findByRole('dialog');
    rerender(<VideoAnalysisView open={false} videoId="video-a" onBack={onBack} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
