import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
    expect(terms).toHaveClass('w-[calc(100%-0.75rem)]');
    expect(terms).toHaveClass('max-w-[calc(100%-0.75rem)]');
    expect(screen.getByText('ExtremelyLongMotionDesignKeywordThatShouldNotOverflow')).toHaveClass('min-w-0');
  });
});
