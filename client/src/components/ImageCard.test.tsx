import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImageCard } from './ImageCard';
import type { Image } from '@/types';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    deleteImage: vi.fn(),
  };
});

vi.mock('@/lib/events', () => ({
  consumeIfMatches: vi.fn(() => false),
}));

function makeImage(term: string): Image {
  return {
    id: 'image-long-term',
    weekId: 'week-a',
    dayOfWeek: 1,
    filePath: 'image.png',
    thumbnailPath: null,
    decoration: 'tape',
    sortOrder: 0,
    createdAt: '2026-07-07T00:00:00.000Z',
    terms: [{ id: 'term-a', imageId: 'image-long-term', keyword: term, position: 0 }],
    tags: [],
    colors: [],
  };
}

describe('ImageCard', () => {
  afterEach(() => vi.useRealTimers());

  it('constrains the bottom term tag to the card width', () => {
    render(
      <div className="w-24">
        <ImageCard
          image={makeImage('ExtremelyLongMotionDesignKeywordThatShouldNotOverflow / 超长中文设计标签不应该溢出')}
          onRefresh={() => undefined}
        />
      </div>,
    );

    const terms = screen.getByTestId('image-card-terms');
    expect(terms.closest('.workspace-polaroid')).toHaveClass('workspace-asset-card');
    expect(screen.getByTestId('image-card-terms')).toHaveClass('workspace-card-term-overlay');
    expect(terms).toHaveClass('workspace-card-term-overlay');
    expect(screen.getByText('ExtremelyLongMotionDesignKeywordThatShouldNotOverflow')).toHaveClass('workspace-card-term-part');
  });

  it('keeps the detail dialog mounted through its close animation', () => {
    vi.useFakeTimers();
    render(<ImageCard image={makeImage('Motion')} onRefresh={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: '打开图片详情 image.png' }));
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));

    expect(screen.getByRole('dialog')).toHaveClass('is-closing');

    act(() => vi.advanceTimersByTime(180));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('uses the compact size for copied detail term icons', async () => {
    render(<ImageCard image={makeImage('Motion')} onRefresh={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: '打开图片详情 image.png' }));
    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Motion' })[1]);
    });

    expect(document.querySelector('.workspace-design-term-check svg')).toHaveClass('w-3', 'h-3');
  });
});
