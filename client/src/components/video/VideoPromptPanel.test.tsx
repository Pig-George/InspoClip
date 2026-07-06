import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VideoPromptPanel } from './VideoPromptPanel';
import { generateVideoOutput } from '@/lib/video-api';

vi.mock('@/lib/video-api', () => ({ generateVideoOutput: vi.fn() }));

describe('VideoPromptPanel', () => {
  it('uses general purpose by default', async () => {
    vi.mocked(generateVideoOutput).mockResolvedValue({ id: 'p', purpose: 'general', target: '', locale: 'zh', content: 'result' });
    render(<VideoPromptPanel videoId="v" />);
    await userEvent.click(screen.getByRole('button', { name: '生成输出' }));
    expect(generateVideoOutput).toHaveBeenCalledWith('v', 'general', '', 'zh');
    expect(await screen.findByText('result')).toBeInTheDocument();
  });

  it('switches purpose without analyzing the video again', async () => {
    vi.mocked(generateVideoOutput).mockResolvedValue({ id: 'p', purpose: 'frontend', target: 'React', locale: 'zh', content: 'code spec' });
    render(<VideoPromptPanel videoId="v" />);
    await userEvent.click(screen.getByRole('button', { name: '前端实现' }));
    await userEvent.type(screen.getByLabelText('目标平台'), 'React');
    await userEvent.click(screen.getByRole('button', { name: '生成输出' }));
    expect(generateVideoOutput).toHaveBeenCalledWith('v', 'frontend', 'React', 'zh');
  });
});
