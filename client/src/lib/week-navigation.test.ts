import { describe, expect, it } from 'vitest';

import { canNavigateToNextWeek } from './week-navigation';

describe('canNavigateToNextWeek', () => {
  const now = new Date('2026-07-15T12:00:00');

  it('allows moving forward from a historical week', () => {
    expect(canNavigateToNextWeek(new Date('2026-07-06T00:00:00'), now)).toBe(true);
  });

  it('blocks moving forward from the current week', () => {
    expect(canNavigateToNextWeek(new Date('2026-07-13T00:00:00'), now)).toBe(false);
  });

  it('normalizes dates within the same week before comparing them', () => {
    expect(canNavigateToNextWeek(new Date('2026-07-19T18:00:00'), now)).toBe(false);
  });

  it('blocks moving farther forward from a future week', () => {
    expect(canNavigateToNextWeek(new Date('2026-07-20T00:00:00'), now)).toBe(false);
  });
});
