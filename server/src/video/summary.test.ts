import { describe, expect, it } from 'vitest';

import { cardSummaryFromAnalysis } from './summary.js';

describe('video card summary', () => {
  it('uses the localized analysis summary for card titles when available', () => {
    expect(cardSummaryFromAnalysis({
      summary: 'legacy zh summary',
      analysis: {
        summary: { en: 'Card expansion motion', zh: '卡片展开动效' },
      },
    })).toEqual({ en: 'Card expansion motion', zh: '卡片展开动效' });
  });

  it('falls back to the stored plain summary for legacy analyses', () => {
    expect(cardSummaryFromAnalysis({
      summary: 'legacy zh summary',
      analysis: {
        summary: 'legacy zh summary',
      },
    })).toBe('legacy zh summary');
  });

  it('returns null when no analysis exists', () => {
    expect(cardSummaryFromAnalysis(undefined)).toBeNull();
  });
});
