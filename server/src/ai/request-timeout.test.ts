import { describe, expect, it } from 'vitest';

import { withRequestTimeout } from './request-timeout.js';

describe('withRequestTimeout', () => {
  it('rejects a model request that does not settle before the deadline', async () => {
    await expect(withRequestTimeout(new Promise<never>(() => {}), 0))
      .rejects.toThrow('Image model request timed out');
  });

  it('returns a completed model request before the deadline', async () => {
    await expect(withRequestTimeout(Promise.resolve('complete'), 1_000)).resolves.toBe('complete');
  });
});
