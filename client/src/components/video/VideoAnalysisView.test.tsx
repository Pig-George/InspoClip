import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/context/LanguageContext';
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
    summary: { en: 'A compact UI transition', zh: '紧凑的 UI 转场' },
    visualStyle: { colors: [], typography: '', layout: '', effects: [] },
    stages: [{
      startTime: 0,
      endTime: 1.2,
      title: { en: 'Open panel', zh: '打开面板' },
      initialState: { en: 'closed', zh: '关闭' },
      trigger: { en: 'tap', zh: '点击' },
      actions: [{ subject: { en: 'panel', zh: '面板' }, action: { en: 'slides in', zh: '滑入' }, from: {}, to: {}, durationMs: 300, delayMs: 0, easing: 'ease-out' }],
      resultState: { en: 'open', zh: '打开' },
    }],
    assets: [],
    uncertainties: [],
  },
};

function renderWithLocale(ui: React.ReactElement, locale: 'zh' | 'en' = 'zh') {
  localStorage.setItem('inspoclip-locale', locale);
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe('VideoAnalysisView', () => {
  it('renders video analysis in a modal with the same two-column detail layout as image detail', async () => {
    vi.mocked(fetchVideo).mockResolvedValue(detail);
    vi.mocked(fetchVideoJob).mockResolvedValue(detail.job);
    vi.mocked(retryVideo).mockResolvedValue(detail.job);
    const onBack = vi.fn();

    renderWithLocale(<VideoAnalysisView open videoId="video-a" initialJobId="job-a" onBack={onBack} />);

    const dialog = await screen.findByRole('dialog', { name: '视频动效分析' });
    expect(dialog).toHaveClass('max-w-4xl');
    expect(dialog).toHaveClass('overflow-hidden');
    expect(screen.getByText('紧凑的 UI 转场')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /打开面板/ })).toBeInTheDocument();
    expect(document.querySelector('[data-dialog-overlay]')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('uses English copy throughout the video detail dialog when the UI locale is English', async () => {
    vi.mocked(fetchVideo).mockResolvedValue({
      ...detail,
      job: { ...detail.job, status: 'processing' as const, progress: 42 },
      analysis: null,
    });
    vi.mocked(fetchVideoJob).mockResolvedValue({ ...detail.job, status: 'processing' as const, progress: 42 });
    const onBack = vi.fn();

    renderWithLocale(<VideoAnalysisView open videoId="video-a" initialJobId="job-a" onBack={onBack} />, 'en');

    expect(await screen.findByRole('dialog', { name: 'Video motion analysis' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Stage analysis')).toBeInTheDocument();
    expect(screen.getByText('Understanding video')).toBeInTheDocument();
    expect(screen.getByText('The stage timeline will appear here after analysis completes.')).toBeInTheDocument();
  });

  it('closes the modal with Escape', async () => {
    vi.mocked(fetchVideo).mockResolvedValue(detail);
    vi.mocked(fetchVideoJob).mockResolvedValue(detail.job);
    const onBack = vi.fn();

    renderWithLocale(<VideoAnalysisView open videoId="video-a" onBack={onBack} />);

    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(onBack).toHaveBeenCalledTimes(1));
  });

  it('keeps the dialog mounted for the exit animation when open becomes false', async () => {
    vi.mocked(fetchVideo).mockResolvedValue(detail);
    vi.mocked(fetchVideoJob).mockResolvedValue(detail.job);
    const onBack = vi.fn();

    const { rerender } = renderWithLocale(<VideoAnalysisView open videoId="video-a" onBack={onBack} />);

    await screen.findByRole('dialog');
    rerender(<LanguageProvider><VideoAnalysisView open={false} videoId="video-a" onBack={onBack} /></LanguageProvider>);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
