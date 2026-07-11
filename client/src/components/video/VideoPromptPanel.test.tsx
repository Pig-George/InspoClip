import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { generateVideoOutput } from '@/lib/video-api';

import { VideoPromptPanel } from './VideoPromptPanel';

vi.mock('@/lib/video-api', () => ({ generateVideoOutput: vi.fn() }));

describe('VideoPromptPanel', () => {
  it('uses general purpose and the current UI language in auto mode by default', async () => {
    vi.mocked(generateVideoOutput).mockResolvedValue({ id: 'p', purpose: 'general', target: '', locale: 'zh', content: 'result' });

    render(<VideoPromptPanel videoId="v" />);

    await userEvent.click(screen.getByRole('button', { name: '生成输出' }));
    expect(generateVideoOutput).toHaveBeenCalledWith('v', 'general', '', 'zh');
    expect(await screen.findByText('result')).toBeInTheDocument();
    expect(screen.getByText('可复刻提示词')).toBeInTheDocument();
  });

  it('supports bilingual video prompts from the language toggle', async () => {
    vi.mocked(generateVideoOutput).mockResolvedValue({ id: 'p', purpose: 'general', target: '', locale: 'both', content: 'bilingual result' });

    render(<VideoPromptPanel videoId="v" />);

    await userEvent.click(screen.getByRole('button', { name: 'EN/中' }));
    await userEvent.click(screen.getByRole('button', { name: '生成输出' }));
    expect(generateVideoOutput).toHaveBeenCalledWith('v', 'general', '', 'both');
  });

  it('switches purpose without analyzing the video again', async () => {
    vi.mocked(generateVideoOutput).mockResolvedValue({ id: 'p', purpose: 'frontend', target: 'React', locale: 'zh', content: 'code spec' });

    render(<VideoPromptPanel videoId="v" />);

    await userEvent.click(screen.getByRole('button', { name: '前端实现' }));
    await userEvent.type(screen.getByLabelText('目标平台'), 'React');
    await userEvent.click(screen.getByRole('button', { name: '生成输出' }));
    expect(generateVideoOutput).toHaveBeenCalledWith('v', 'frontend', 'React', 'zh');
  });

  it('renders json purpose output in a dedicated formatted code view', async () => {
    vi.mocked(generateVideoOutput).mockResolvedValue({ id: 'p', purpose: 'json', target: '', locale: 'zh', content: '{"summary":"demo"}' });

    render(<VideoPromptPanel videoId="v" />);

    await userEvent.click(screen.getByRole('button', { name: '结构化 JSON' }));
    await userEvent.click(screen.getByRole('button', { name: '生成输出' }));
    expect(await screen.findByText('用于调试、导出或二次处理。')).toBeInTheDocument();
    expect(screen.getByText(/"summary": "demo"/)).toBeInTheDocument();
  });
});
