import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '@/context/LanguageContext';
import { VideoCard } from './VideoCard';

function renderWithLocale(ui: React.ReactElement, locale: 'zh' | 'en' = 'zh') {
  localStorage.setItem('inspoclip-locale', locale);
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe('VideoCard', () => {
  it('shows metadata and opens the analysis when clicked', () => {
    const onOpen = vi.fn();
    renderWithLocale(<VideoCard video={{
      id: 'video-a', weekId: 'week-a', dayOfWeek: 1, sortOrder: 0,
      filePath: 'video.mp4', thumbnailPath: 'video.thumb.jpg', originalName: 'Demo.mp4',
      mimeType: 'video/mp4', sizeBytes: 100, durationMs: 65_000, width: 1280, height: 720,
      source: 'client', createdAt: new Date().toISOString(), summary: null, tags: [],
      job: { id: 'job-a', videoId: 'video-a', status: 'processing', progress: 40, model: 'qwen3.7-plus', fps: 3, attemptCount: 1, errorMessage: null },
    }} onOpen={onOpen} onRefresh={() => undefined} />);

    expect(screen.getByText('Demo.mp4')).toBeInTheDocument();
    expect(screen.getByText('01:05')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Demo.mp4/ }));
    expect(onOpen).toHaveBeenCalledWith('video-a', 'job-a');
  });

  it('uses the same scrapbook styling as image cards with a stable tilt and decoration', () => {
    renderWithLocale(<VideoCard video={{
      id: 'video-a', weekId: 'week-a', dayOfWeek: 1, sortOrder: 0,
      filePath: 'video.mp4', thumbnailPath: null, originalName: 'Demo.mp4',
      mimeType: 'video/mp4', sizeBytes: 100, durationMs: 5_000, width: 1280, height: 720,
      source: 'client', createdAt: new Date().toISOString(), summary: null, tags: [], job: null,
    }} onOpen={() => undefined} onRefresh={() => undefined} />);

    const card = screen.getByRole('button', { name: /Demo.mp4/ });
    expect(card).toHaveClass('polaroid');
    expect(card).toHaveClass('workspace-asset-card');
    expect(card.querySelector('.workspace-card-media')).not.toBeNull();
    expect(card.querySelector('.workspace-video-duration')).not.toBeNull();
    expect(card.querySelector('.workspace-video-caption')).not.toBeNull();
    expect(card.querySelector('.workspace-video-caption-status')).not.toBeNull();
  });

  it('shows AI summary as title when available', () => {
    renderWithLocale(<VideoCard video={{
      id: 'video-b', weekId: 'week-a', dayOfWeek: 1, sortOrder: 0,
      filePath: 'video.mp4', thumbnailPath: 'thumb.jpg', originalName: 'raw-file.mp4',
      mimeType: 'video/mp4', sizeBytes: 100, durationMs: 5_000, width: 1280, height: 720,
      source: 'client', createdAt: new Date().toISOString(),
      summary: '卡片展开动效', tags: [],
      job: { id: 'job-b', videoId: 'video-b', status: 'completed', progress: 100, model: 'qwen3.7-plus', fps: 3, attemptCount: 1, errorMessage: null },
    }} onOpen={() => undefined} onRefresh={() => undefined} />);

    expect(screen.getByText('卡片展开动效')).toBeInTheDocument();
    expect(screen.queryByText('raw-file.mp4')).not.toBeInTheDocument();
  });

  it('localizes a bilingual AI summary title from the current UI locale', () => {
    renderWithLocale(<VideoCard video={{
      id: 'video-c', weekId: 'week-a', dayOfWeek: 1, sortOrder: 0,
      filePath: 'video.mp4', thumbnailPath: 'thumb.jpg', originalName: 'raw-file.mp4',
      mimeType: 'video/mp4', sizeBytes: 100, durationMs: 5_000, width: 1280, height: 720,
      source: 'client', createdAt: new Date().toISOString(),
      summary: { en: 'Card expansion motion', zh: '卡片展开动效' },
      tags: [],
      job: { id: 'job-c', videoId: 'video-c', status: 'completed', progress: 100, model: 'qwen3.7-plus', fps: 3, attemptCount: 1, errorMessage: null },
    }} onOpen={() => undefined} onRefresh={() => undefined} />, 'en');

    expect(screen.getByText('Card expansion motion')).toBeInTheDocument();
    expect(screen.getByText('Analysis complete')).toBeInTheDocument();
    expect(screen.queryByText('卡片展开动效')).not.toBeInTheDocument();
    expect(screen.queryByText('raw-file.mp4')).not.toBeInTheDocument();
  });
});
