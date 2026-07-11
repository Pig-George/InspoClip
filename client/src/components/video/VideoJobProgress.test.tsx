import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LanguageProvider } from '@/context/LanguageContext';
import type { VideoJob } from '@/types/video';
import { VideoJobProgress } from './VideoJobProgress';

const job: VideoJob = {
  id: 'job-a',
  videoId: 'video-a',
  status: 'failed',
  progress: 35,
  model: 'qwen3.7-plus',
  fps: 3,
  attemptCount: 1,
  errorMessage: 'Model error',
};

function renderWithLocale(locale: 'zh' | 'en') {
  localStorage.setItem('inspoclip-locale', locale);
  render(
    <LanguageProvider>
      <VideoJobProgress job={job} onRetry={() => {}} />
    </LanguageProvider>,
  );
}

describe('VideoJobProgress', () => {
  it('renders Chinese job labels by default locale', () => {
    renderWithLocale('zh');

    expect(screen.getByText('分析失败')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  });

  it('renders English job labels when locale is English', () => {
    renderWithLocale('en');

    expect(screen.getByText('Analysis failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
