import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchContentWeeks } from './api';

describe('week API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('loads content weeks through the inspiration-mode endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ weeks: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchContentWeeks('2026-07-11', 'previous', 8);

    expect(fetchMock).toHaveBeenCalledWith('/api/weeks/content-days?cursor=2026-07-11&direction=previous&limit=8');
  });
});
