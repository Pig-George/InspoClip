import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('database startup schema', () => {
  it('does not drop generated video prompt outputs on startup', async () => {
    const source = await readFile(
      fileURLToPath(new URL('../index.ts', import.meta.url)),
      'utf8',
    );

    expect(source).not.toMatch(/DROP\s+TABLE\s+IF\s+EXISTS\s+video_prompt_outputs/i);
  });
});
