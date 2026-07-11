import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { fetchMonth } from '@/lib/api';
import { TimelineView } from './TimelineView';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    fetchMonth: vi.fn(),
  };
});

vi.mock('@/components/video/VideoCard', () => ({
  VideoCard: ({ video }: { video: { originalName: string } }) => (
    <div data-testid="timeline-video-card">{video.originalName}</div>
  ),
}));

vi.mock('@/components/ImageCard', () => ({
  ImageCard: ({ image }: { image: { id: string } }) => (
    <div data-testid="timeline-image-card">{image.id}</div>
  ),
}));

describe('TimelineView', () => {
  it('renders videos in the weekly timeline content', async () => {
    vi.mocked(fetchMonth).mockResolvedValue({
      month: '2026-07',
      weeks: [
        {
          week: {
            id: 'week-a',
            weekStart: '2026-07-06',
            createdAt: '2026-07-06T00:00:00.000Z',
          },
          images: [],
          videos: [
            {
              id: 'video-a',
              weekId: 'week-a',
              dayOfWeek: 2,
              sortOrder: 0,
              filePath: 'demo.mp4',
              thumbnailPath: null,
              originalName: 'Demo motion.mp4',
              mimeType: 'video/mp4',
              sizeBytes: 1024,
              durationMs: 12000,
              width: 1280,
              height: 720,
              source: 'client',
              createdAt: '2026-07-08T00:00:00.000Z',
              job: null,
              summary: null,
              tags: [],
            },
          ],
        },
      ],
    } as any);

    render(<TimelineView onOpenVideo={() => undefined} />);

    await waitFor(() => expect(fetchMonth).toHaveBeenCalled());
    expect(screen.getByTestId('timeline-video-card')).toHaveTextContent('Demo motion.mp4');
    expect(screen.queryByText('No inspirations this week')).not.toBeInTheDocument();
  });

  it('renders images with the shared image card in the weekly timeline content', async () => {
    vi.mocked(fetchMonth).mockResolvedValue({
      month: '2026-07',
      weeks: [
        {
          week: {
            id: 'week-a',
            weekStart: '2026-07-06',
            createdAt: '2026-07-06T00:00:00.000Z',
          },
          images: [
            {
              id: 'image-a',
              weekId: 'week-a',
              dayOfWeek: 1,
              filePath: 'image-a.png',
              thumbnailPath: null,
              decoration: 'tape',
              sortOrder: 0,
              createdAt: '2026-07-07T00:00:00.000Z',
              terms: [],
              tags: [],
              colors: [],
            },
          ],
          videos: [],
        },
      ],
    } as any);

    render(<TimelineView onOpenVideo={() => undefined} />);

    await waitFor(() => expect(fetchMonth).toHaveBeenCalled());
    expect(screen.getByTestId('timeline-image-card')).toHaveTextContent('image-a');
  });
});
