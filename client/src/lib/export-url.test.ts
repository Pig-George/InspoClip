import { describe, expect, it } from 'vitest';

import { exportUrl } from './api';

describe('exportUrl', () => {
  it('uses the current week endpoint for week exports', () => {
    expect(exportUrl({ scope: 'week', weekDate: '2026-07-06', format: 'zip' }))
      .toBe('/api/export/week/2026-07-06?format=zip');
  });

  it('uses the all-content endpoint for inspiration exports', () => {
    expect(exportUrl({ scope: 'all', weekDate: '2026-07-06', format: 'json' }))
      .toBe('/api/export/all?format=json');
  });
});
