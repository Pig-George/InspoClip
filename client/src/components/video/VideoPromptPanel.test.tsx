import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LanguageProvider } from '@/context/LanguageContext';
import { generateVideoOutput, fetchVideoOutput } from '@/lib/video-api';
import { getInflight, setInflight } from '@/lib/video-prompt-cache';

import { VideoPromptPanel } from './VideoPromptPanel';

vi.mock('@/lib/video-api', () => ({
  generateVideoOutput: vi.fn(),
  fetchVideoOutput: vi.fn(),
}));

vi.mock('@/lib/video-prompt-cache', () => ({
  getInflight: vi.fn(),
  setInflight: vi.fn(),
}));

function renderWithLocale(locale: 'zh' | 'en' = 'zh') {
  localStorage.setItem('inspoclip-locale', locale);
  return render(
    <LanguageProvider>
      <VideoPromptPanel videoId="v" />
    </LanguageProvider>,
  );
}

describe('VideoPromptPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
    vi.mocked(fetchVideoOutput).mockResolvedValue(null);
    vi.mocked(generateVideoOutput).mockResolvedValue({ id: 'p', purpose: 'general', target: '', contentEn: '', contentZh: '' });
    vi.mocked(getInflight).mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-loads existing prompt on mount and shows content for the UI locale', async () => {
    vi.mocked(fetchVideoOutput).mockResolvedValue({ id: 'p', purpose: 'general', target: '', contentEn: 'hello', contentZh: '你好' });

    renderWithLocale();

    await waitFor(() => expect(fetchVideoOutput).toHaveBeenCalledWith('v', 'general'));
    expect(await screen.findByText('你好')).toBeInTheDocument();
  });

  it('forces regeneration when refreshing an existing prompt', async () => {
    vi.mocked(fetchVideoOutput).mockResolvedValue({ id: 'p', purpose: 'general', target: '', contentEn: 'old', contentZh: 'old zh' });
    vi.mocked(generateVideoOutput).mockResolvedValue({ id: 'p', purpose: 'general', target: '', contentEn: 'new', contentZh: 'new zh' });

    renderWithLocale('en');

    expect(await screen.findByText('old')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Regenerate' }));

    await waitFor(() => expect(generateVideoOutput).toHaveBeenCalledWith('v', 'general', '', true));
    expect(await screen.findByText('new')).toBeInTheDocument();
  });

  it('uses only the regenerate button spinner while refreshing an existing prompt', async () => {
    vi.mocked(fetchVideoOutput).mockResolvedValue({ id: 'p', purpose: 'general', target: '', contentEn: 'old', contentZh: 'old zh' });
    vi.mocked(generateVideoOutput).mockReturnValue(new Promise(() => {}));

    renderWithLocale('en');

    expect(await screen.findByText('old')).toBeInTheDocument();
    const regenerate = screen.getByRole('button', { name: 'Regenerate' });
    await userEvent.click(regenerate);

    await waitFor(() => expect(generateVideoOutput).toHaveBeenCalledWith('v', 'general', '', true));
    expect(screen.queryByText('Generating…')).not.toBeInTheDocument();
    expect(regenerate.querySelector('svg')).toHaveClass('animate-spin');
  });

  it('renders as an integrated sidebar section', () => {
    renderWithLocale();

    const section = screen.getByLabelText('复刻输出');
    expect(section).toHaveClass('border-t');
    expect(screen.getByText('用途')).toBeInTheDocument();
  });

  it('localizes the prompt output controls in English', async () => {
    renderWithLocale('en');

    expect(screen.getByLabelText('Replication output')).toBeInTheDocument();
    expect(screen.getByText('Purpose')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Generate output' })).toBeInTheDocument();
  });

  it('shows generate button when no existing prompt', async () => {
    vi.mocked(fetchVideoOutput).mockResolvedValue(null);
    vi.mocked(generateVideoOutput).mockResolvedValue({ id: 'p', purpose: 'general', target: '', contentEn: 'gen en', contentZh: '生成中文' });

    renderWithLocale();

    await waitFor(() => expect(fetchVideoOutput).toHaveBeenCalled());
    const generateBtn = await screen.findByRole('button', { name: '生成输出' });
    await userEvent.click(generateBtn);
    expect(generateVideoOutput).toHaveBeenCalledWith('v', 'general', '', false);
    expect(setInflight).toHaveBeenCalledWith('v', 'general', expect.any(Promise));
    expect(await screen.findByText('生成中文')).toBeInTheDocument();
  });

  it('switches purpose and reloads existing output', async () => {
    vi.mocked(fetchVideoOutput)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'p2', purpose: 'frontend', target: '', contentEn: 'react en', contentZh: 'React 中文' });

    renderWithLocale();

    await waitFor(() => expect(fetchVideoOutput).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: '前端实现' }));
    await waitFor(() => expect(fetchVideoOutput).toHaveBeenCalledWith('v', 'frontend'));
    expect(await screen.findByText('React 中文')).toBeInTheDocument();
  });

  it('toggles language display without calling the API again', async () => {
    vi.mocked(fetchVideoOutput).mockResolvedValue({ id: 'p', purpose: 'general', target: '', contentEn: 'english text', contentZh: '中文内容' });

    renderWithLocale();

    expect(await screen.findByText('中文内容')).toBeInTheDocument();
    const initialCallCount = vi.mocked(fetchVideoOutput).mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByText('english text')).toBeInTheDocument();
    expect(screen.queryByText('中文内容')).not.toBeInTheDocument();
    expect(vi.mocked(fetchVideoOutput).mock.calls.length).toBe(initialCallCount);
    expect(generateVideoOutput).not.toHaveBeenCalled();
  });

  it('renders json purpose output in a formatted code view', async () => {
    const json = '{"summary":"demo"}';
    vi.mocked(fetchVideoOutput).mockResolvedValue({ id: 'p', purpose: 'json', target: '', contentEn: json, contentZh: json });

    renderWithLocale();

    await userEvent.click(screen.getByRole('button', { name: '结构化 JSON' }));
    await waitFor(() => expect(fetchVideoOutput).toHaveBeenCalledWith('v', 'json'));
    expect(await screen.findByText(/"summary": "demo"/)).toBeInTheDocument();
  });

  it('shows generating state when an in-flight request exists on mount', async () => {
    const pending = new Promise<{ id: string; purpose: 'general'; target: string; contentEn: string; contentZh: string }>(() => {});
    vi.mocked(getInflight).mockReturnValue(pending as never);

    renderWithLocale();

    expect(await screen.findByText('生成中…')).toBeInTheDocument();
    expect(fetchVideoOutput).not.toHaveBeenCalled();
  });

  it('reuses in-flight request when generate is clicked again', async () => {
    vi.mocked(fetchVideoOutput).mockResolvedValue(null);
    const pending = new Promise<{ id: string; purpose: 'general'; target: string; contentEn: string; contentZh: string }>(() => {});
    vi.mocked(getInflight).mockReturnValue(pending as never);

    renderWithLocale();

    await waitFor(() => expect(getInflight).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: '生成输出' })).not.toBeInTheDocument();
    expect(generateVideoOutput).not.toHaveBeenCalled();
  });

  it('recovers generating state from backend after page refresh', async () => {
    const output = { id: 'p', purpose: 'general' as const, target: '', contentEn: 'refreshed en', contentZh: '刷新后中文' };
    vi.mocked(fetchVideoOutput)
      .mockResolvedValueOnce({ generating: true })
      .mockResolvedValueOnce({ generating: true })
      .mockResolvedValueOnce(output);

    renderWithLocale();

    expect(await screen.findByText('生成中…')).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);

    await waitFor(() => expect(screen.getByText('刷新后中文')).toBeInTheDocument());
  });
});
