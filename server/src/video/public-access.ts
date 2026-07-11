import { randomBytes } from 'node:crypto';

export interface ModelVideoAccessToken {
  token: string;
  videoId: string;
  expiresAt: Date;
}

interface TokenRecord extends ModelVideoAccessToken {
  revoked: boolean;
}

export interface ModelVideoAccessTokensOptions {
  ttlMs?: number;
  now?: () => number;
}

export class ModelVideoAccessTokens {
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly records = new Map<string, TokenRecord>();

  constructor(options: ModelVideoAccessTokensOptions = {}) {
    this.ttlMs = options.ttlMs ?? 2 * 60 * 60 * 1_000;
    this.now = options.now ?? Date.now;
  }

  issue(videoId: string): ModelVideoAccessToken {
    this.pruneExpired();
    const token = randomBytes(32).toString('base64url');
    const record: TokenRecord = {
      token,
      videoId,
      expiresAt: new Date(this.now() + this.ttlMs),
      revoked: false,
    };
    this.records.set(token, record);
    return { token: record.token, videoId: record.videoId, expiresAt: record.expiresAt };
  }

  verify(videoId: string, token: string | null | undefined): boolean {
    if (!token) return false;
    const record = this.records.get(token);
    if (!record || record.revoked || record.videoId !== videoId) return false;
    if (record.expiresAt.getTime() <= this.now()) {
      this.records.delete(token);
      return false;
    }
    return true;
  }

  revoke(token: string | null | undefined): void {
    if (!token) return;
    const record = this.records.get(token);
    if (record) record.revoked = true;
  }

  private pruneExpired(): void {
    const now = this.now();
    for (const [token, record] of this.records) {
      if (record.revoked || record.expiresAt.getTime() <= now) this.records.delete(token);
    }
  }
}
