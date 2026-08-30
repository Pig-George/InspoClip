import { describe, expect, it } from 'vitest';
import type { WeekData } from '@/types';
import { canScrollDayContent, getDayContentScroller, getInitialDayScrollTarget } from './DayView';

function makeWeek(weekStart: string, contentDays: number[]): WeekData {
  return {
    week: {
      id: `week-${weekStart}`,
      weekStart,
      createdAt: `${weekStart}T00:00:00.000Z`,
    },
    images: contentDays.map((dayOfWeek, index) => ({
      id: `image-${weekStart}-${dayOfWeek}-${index}`,
      weekId: `week-${weekStart}`,
      dayOfWeek,
      filePath: '/images/demo.png',
      thumbnailPath: null,
      decoration: 'tape',
      sortOrder: index,
      createdAt: `${weekStart}T00:00:00.000Z`,
      terms: [],
      tags: [],
      colors: [],
    })),
    videos: [],
    notes: null,
  };
}

describe('getInitialDayScrollTarget', () => {
  it('targets the newest content date instead of empty today in inspiration mode', () => {
    const target = getInitialDayScrollTarget({
      loadedMondays: ['2026-06-22', '2026-07-06'],
      weekDataByMonday: new Map([
        ['2026-06-22', makeWeek('2026-06-22', [2])],
        ['2026-07-06', makeWeek('2026-07-06', [])],
      ]),
      todayIso: '2026-07-11',
      initMonday: '2026-07-06',
      hideEmpty: true,
    });

    expect(target.isoDate).toBe('2026-06-24');
  });

  it('keeps today as the target when today has content', () => {
    const target = getInitialDayScrollTarget({
      loadedMondays: ['2026-07-06'],
      weekDataByMonday: new Map([['2026-07-06', makeWeek('2026-07-06', [5])]]),
      todayIso: '2026-07-11',
      initMonday: '2026-07-06',
      hideEmpty: true,
    });

    expect(target.isoDate).toBe('2026-07-11');
  });

  it('falls back to today when inspiration mode has no content', () => {
    const target = getInitialDayScrollTarget({
      loadedMondays: ['2026-07-06'],
      weekDataByMonday: new Map([['2026-07-06', makeWeek('2026-07-06', [])]]),
      todayIso: '2026-07-11',
      initMonday: '2026-07-06',
      hideEmpty: true,
    });

    expect(target.isoDate).toBe('2026-07-11');
  });
});

describe('day column wheel routing', () => {
  it('routes vertical wheel input to the scrollable day content instead of the card shell', () => {
    const column = document.createElement('article');
    column.dataset.dayColumn = '';
    const content = document.createElement('div');
    content.className = 'workspace-day-content client-day-column-content';
    const card = document.createElement('div');
    content.appendChild(card);
    column.appendChild(content);

    Object.defineProperties(content, {
      clientHeight: { value: 180 },
      scrollHeight: { value: 420 },
      scrollTop: { value: 0, writable: true },
    });

    expect(getDayContentScroller(card)).toBe(content);
    expect(canScrollDayContent(content, 80)).toBe(true);
    expect(canScrollDayContent(content, -80)).toBe(false);
  });
});
