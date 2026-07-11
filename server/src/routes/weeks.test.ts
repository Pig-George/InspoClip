import { describe, expect, it } from 'vitest';

import { getContentWeekStarts } from './weeks.js';

describe('week content day helpers', () => {
  it('finds previous content weeks across large empty gaps', () => {
    expect(
      getContentWeekStarts(
        [
          { weekStart: '2026-05-04', dayOfWeek: 2 },
          { weekStart: '2026-06-22', dayOfWeek: 4 },
        ],
        '2026-07-11',
        'previous',
        5,
      ),
    ).toEqual(['2026-06-22', '2026-05-04']);
  });

  it('treats video-only days as content days', () => {
    expect(
      getContentWeekStarts(
        [
          { weekStart: '2026-07-06', dayOfWeek: 0 },
          { weekStart: '2026-06-29', dayOfWeek: 1 },
        ],
        '2026-07-01',
        'next',
        5,
      ),
    ).toEqual(['2026-07-06']);
  });
});
