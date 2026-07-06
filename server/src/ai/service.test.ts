import { describe, expect, it, vi } from 'vitest';

import type { ModelProvider } from './provider.js';
import { DESIGN_ANALYSIS_PROMPT, IMAGE_TERMINOLOGY_PROMPT } from './prompts.js';
import {
  AiService,
  type AiServiceDependencies,
} from './service.js';

function createHarness(response: unknown = '[]') {
  const provider: ModelProvider = {
    analyzeImage: vi.fn().mockResolvedValue(response),
    analyzeVideo: vi.fn(),
    generateText: vi.fn(),
  };
  const original = Buffer.from('original-image');
  const resized = Buffer.from('resized-jpeg');
  const dependencies: AiServiceDependencies = {
    readFile: vi.fn().mockResolvedValue(original),
    imageProcessor: {
      metadata: vi.fn().mockResolvedValue({ width: 640, height: 480, format: 'jpeg' }),
      resizeToJpeg: vi.fn().mockResolvedValue(resized),
    },
  };
  return {
    service: new AiService(provider, dependencies),
    provider,
    dependencies,
    original,
    resized,
  };
}

describe('AiService', () => {
  it('resizes an image larger than 1024 and sends it as JPEG', async () => {
    const harness = createHarness('["card layout / 卡片布局"]');
    vi.mocked(harness.dependencies.imageProcessor.metadata)
      .mockResolvedValue({ width: 2048, height: 1536, format: 'png' });

    await harness.service.generateTerms('/uploads/large.png');

    expect(harness.dependencies.imageProcessor.resizeToJpeg).toHaveBeenCalledWith(
      harness.original,
      1024,
      80,
    );
    expect(harness.provider.analyzeImage).toHaveBeenCalledWith({
      base64Image: harness.resized.toString('base64'),
      mimeType: 'image/jpeg',
      prompt: IMAGE_TERMINOLOGY_PROMPT,
    });
  });

  it('keeps a small PNG unchanged', async () => {
    const harness = createHarness();
    vi.mocked(harness.dependencies.imageProcessor.metadata)
      .mockResolvedValue({ width: 640, height: 480, format: 'png' });

    await harness.service.generateTerms('/uploads/small.png');

    expect(harness.dependencies.imageProcessor.resizeToJpeg).not.toHaveBeenCalled();
    expect(harness.provider.analyzeImage).toHaveBeenCalledWith({
      base64Image: harness.original.toString('base64'),
      mimeType: 'image/png',
      prompt: IMAGE_TERMINOLOGY_PROMPT,
    });
  });

  it.each(['/uploads/small.PNG', '/uploads/image-without-extension'])(
    'detects PNG content independently of the path: %s',
    async (path) => {
      const harness = createHarness();
      vi.mocked(harness.dependencies.imageProcessor.metadata)
        .mockResolvedValue({ width: 640, height: 480, format: 'png' });

      await harness.service.generateTerms(path);

      expect(harness.provider.analyzeImage).toHaveBeenCalledWith(expect.objectContaining({
        base64Image: harness.original.toString('base64'),
        mimeType: 'image/png',
      }));
    },
  );

  it.each([
    { format: 'webp', path: '/uploads/design.webp', mimeType: 'image/webp' },
    { format: 'gif', path: '/uploads/design.gif', mimeType: 'image/gif' },
  ] as const)('keeps a small $format image unchanged', async ({ format, path, mimeType }) => {
    const harness = createHarness();
    vi.mocked(harness.dependencies.imageProcessor.metadata)
      .mockResolvedValue({ width: 640, height: 480, format });

    await harness.service.generateTerms(path);

    expect(harness.dependencies.imageProcessor.resizeToJpeg).not.toHaveBeenCalled();
    expect(harness.provider.analyzeImage).toHaveBeenCalledWith(expect.objectContaining({
      base64Image: harness.original.toString('base64'),
      mimeType,
    }));
  });

  it('falls back to the original image when metadata inspection fails', async () => {
    const harness = createHarness('["fallback"]');
    vi.mocked(harness.dependencies.imageProcessor.metadata)
      .mockRejectedValue(new Error('corrupt metadata payload'));

    await expect(harness.service.generateTerms('/uploads/design.PNG'))
      .resolves.toEqual(['fallback']);

    expect(harness.provider.analyzeImage).toHaveBeenCalledWith(expect.objectContaining({
      base64Image: harness.original.toString('base64'),
      mimeType: 'image/png',
    }));
  });

  it('uses the GIF MIME type when metadata inspection fails for an uppercase extension', async () => {
    const harness = createHarness('[]');
    vi.mocked(harness.dependencies.imageProcessor.metadata)
      .mockRejectedValue(new Error('corrupt metadata payload'));

    await harness.service.generateTerms('/uploads/animation.GIF');

    expect(harness.provider.analyzeImage).toHaveBeenCalledWith(expect.objectContaining({
      base64Image: harness.original.toString('base64'),
      mimeType: 'image/gif',
    }));
  });

  it('falls back to the original image when JPEG conversion fails', async () => {
    const harness = createHarness('["fallback"]');
    vi.mocked(harness.dependencies.imageProcessor.metadata)
      .mockResolvedValue({ width: 2048, height: 1536, format: 'png' });
    vi.mocked(harness.dependencies.imageProcessor.resizeToJpeg)
      .mockRejectedValue(new Error('conversion included secret bytes'));

    await expect(harness.service.generateTerms('/uploads/design.webp'))
      .resolves.toEqual(['fallback']);

    expect(harness.provider.analyzeImage).toHaveBeenCalledWith(expect.objectContaining({
      base64Image: harness.original.toString('base64'),
      mimeType: 'image/webp',
    }));
  });

  it('parses a JSON terminology array and limits it to ten entries', async () => {
    const values = Array.from({ length: 12 }, (_, index) => `term-${index}`);
    const harness = createHarness(JSON.stringify(values));

    await expect(harness.service.generateTerms('/uploads/design.jpg'))
      .resolves.toEqual(values.slice(0, 10));
  });

  it('falls back to comma and newline separated terminology', async () => {
    const harness = createHarness('minimalist / 极简, card layout / 卡片布局\nspacing / 间距');

    await expect(harness.service.generateTerms('/uploads/design.jpg')).resolves.toEqual([
      'minimalist / 极简',
      'card layout / 卡片布局',
      'spacing / 间距',
    ]);
  });

  it('returns an empty terminology array for an empty response', async () => {
    const harness = createHarness('');

    await expect(harness.service.generateTerms('/uploads/design.jpg')).resolves.toEqual([]);
  });

  it('parses a bilingual design prompt', async () => {
    const harness = createHarness('{"en":"Clean cards","zh":"简洁卡片"}');

    await expect(harness.service.generateDesignPrompt('/uploads/design.jpg')).resolves.toEqual({
      en: 'Clean cards',
      zh: '简洁卡片',
    });
    expect(harness.provider.analyzeImage).toHaveBeenCalledWith({
      base64Image: harness.original.toString('base64'),
      mimeType: 'image/jpeg',
      prompt: DESIGN_ANALYSIS_PROMPT,
    });
  });

  it('uses the raw response for both languages when design JSON is invalid', async () => {
    const harness = createHarness('  use soft gradients  ');

    await expect(harness.service.generateDesignPrompt('/uploads/design.jpg')).resolves.toEqual({
      en: 'use soft gradients',
      zh: 'use soft gradients',
    });
  });

  it('propagates provider failures', async () => {
    const harness = createHarness();
    vi.mocked(harness.provider.analyzeImage).mockRejectedValue(new Error('provider failed'));

    await expect(harness.service.generateTerms('/uploads/design.jpg'))
      .rejects.toThrow('provider failed');
  });
});
