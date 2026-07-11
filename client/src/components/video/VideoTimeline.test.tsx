import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { VideoTimeline } from './VideoTimeline';

describe('VideoTimeline', () => {
  it('selects the clicked stage', async () => {
    const onSelect = vi.fn();
    const stage = {
      startTime: 1.2,
      endTime: 2,
      title: '打开面板',
      initialState: '关闭',
      trigger: '点击',
      actions: [],
      resultState: '打开',
    };

    render(<VideoTimeline stages={[stage]} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: /打开面板/ }));
    expect(onSelect).toHaveBeenCalledWith(stage);
    expect(screen.getByText(/1.2s/)).toBeInTheDocument();
  });

  it('renders localized stage content from the selected locale', () => {
    const stage = {
      startTime: 0,
      endTime: 1,
      title: { en: 'Panel opens', zh: '面板打开' },
      initialState: { en: 'Closed', zh: '关闭' },
      trigger: { en: 'Tap', zh: '点击' },
      actions: [
        {
          subject: { en: 'Card', zh: '卡片' },
          action: { en: 'Slides upward', zh: '向上滑入' },
          from: {},
          to: {},
          durationMs: 400,
          delayMs: 0,
          easing: 'ease-out',
        },
      ],
      resultState: { en: 'Open', zh: '打开' },
    };

    render(<VideoTimeline stages={[stage]} onSelect={vi.fn()} locale="zh" />);

    expect(screen.getByLabelText('视频阶段时间线')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /面板打开/ })).toBeInTheDocument();
    expect(screen.getByText(/关闭 → 点击 → 打开/)).toBeInTheDocument();
    expect(screen.getByText(/卡片：向上滑入/)).toBeInTheDocument();
    expect(screen.queryByText(/Panel opens/)).not.toBeInTheDocument();
  });

  it('localizes timeline chrome for English', () => {
    render(<VideoTimeline stages={[]} onSelect={vi.fn()} locale="en" />);

    expect(screen.getByLabelText('Video stage timeline')).toBeInTheDocument();
  });
});
