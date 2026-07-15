import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryResults: unknown[][] = [];

function queuedQuery() {
  const chain: Record<string, unknown> = {};
  for (const method of ['from', 'where', 'limit', 'orderBy', 'innerJoin']) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(queryResults.shift() ?? []).then(resolve, reject);
  return chain;
}

vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn(() => queuedQuery()),
  },
}));

import searchRouter from './search.js';

describe('GET /api/search', () => {
  beforeEach(() => {
    queryResults.length = 0;
  });

  it('does not return extension video drafts that have not been saved', async () => {
    queryResults.push(
      [],
      [
        { id: 'analysis-draft', videoId: 'draft-video', summary: 'matching motion', analysis: null },
        { id: 'analysis-saved', videoId: 'saved-video', summary: 'matching motion', analysis: null },
      ],
      [
        { id: 'draft-video', source: 'extension', isSaved: false },
        { id: 'saved-video', source: 'extension', isSaved: true },
      ],
      [],
      [],
    );

    const app = express();
    app.use('/api/search', searchRouter);

    const response = await request(app).get('/api/search?q=matching');

    expect(response.status).toBe(200);
    expect(response.body.videos.map((video: { id: string }) => video.id)).toEqual(['saved-video']);
  });
});
