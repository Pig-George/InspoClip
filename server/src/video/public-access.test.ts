import { describe, expect, it } from 'vitest';
import { ModelVideoAccessTokens } from './public-access.js';

describe('ModelVideoAccessTokens', () => {
  it('issues tokens scoped to one video until they expire or are revoked', () => {
    const tokens = new ModelVideoAccessTokens({ ttlMs: 1_000, now: () => 10_000 });
    const issued = tokens.issue('video-a');

    expect(tokens.verify('video-a', issued.token)).toBe(true);
    expect(tokens.verify('video-b', issued.token)).toBe(false);

    tokens.revoke(issued.token);
    expect(tokens.verify('video-a', issued.token)).toBe(false);
  });

  it('rejects expired tokens', () => {
    let now = 10_000;
    const tokens = new ModelVideoAccessTokens({ ttlMs: 1_000, now: () => now });
    const issued = tokens.issue('video-a');

    now = 11_001;

    expect(tokens.verify('video-a', issued.token)).toBe(false);
  });
});
