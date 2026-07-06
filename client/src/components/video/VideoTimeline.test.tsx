import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VideoTimeline } from './VideoTimeline';

describe('VideoTimeline', () => {
  it('selects the clicked stage', async () => {
    const onSelect = vi.fn();
    const stage = { startTime: 1.2, endTime: 2, title: '打开面板', initialState: '关闭', trigger: '点击', actions: [], resultState: '打开' };
    render(<VideoTimeline stages={[stage]} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: /打开面板/ }));
    expect(onSelect).toHaveBeenCalledWith(stage);
    expect(screen.getByText(/1.2s/)).toBeInTheDocument();
  });
});
