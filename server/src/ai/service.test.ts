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

  it('repairs verbose terminology descriptions into concise labels', async () => {
    const verboseTerms = [
      'The composition is a centered sticker-like fruit icon with a circular silhouette and a thick outer ring. / 该构图是一个居中的贴纸风水果图标，整体为圆形轮廓，并带有较厚的外环。',
      'Typography appears bold, heavy, and display-oriented with chunky characters. / 字体看起来粗重、醒目并偏向展示用途。',
    ];
    const conciseTerms = [
      'sticker icon / 贴纸图标',
      'bold display type / 粗体展示字',
    ];
    const harness = createHarness(JSON.stringify(verboseTerms));
    vi.mocked(harness.provider.generateText).mockResolvedValue(JSON.stringify(conciseTerms));

    await expect(harness.service.generateTerms('/uploads/design.jpg'))
      .resolves.toEqual(conciseTerms);

    expect(harness.provider.generateText).toHaveBeenCalledWith({
      prompt: expect.stringContaining(JSON.stringify(verboseTerms)),
    });
  });

  it('does not keep verbose descriptions when the repair output is still invalid', async () => {
    const conciseTerm = 'card layout / 卡片布局';
    const verboseTerm = 'This is a complete sentence explaining the layout hierarchy in unnecessary detail. / 这是一个用完整句子详细解释布局层级的冗长术语描述。';
    const harness = createHarness(JSON.stringify([conciseTerm, verboseTerm]));
    vi.mocked(harness.provider.generateText).mockResolvedValue(JSON.stringify([verboseTerm]));

    await expect(harness.service.generateTerms('/uploads/design.jpg'))
      .resolves.toEqual([conciseTerm]);
  });

  it('keeps concise terminology containing a decimal style name', async () => {
    const term = '2.5D illustration / 2.5D插画';
    const harness = createHarness(JSON.stringify([term]));

    await expect(harness.service.generateTerms('/uploads/design.jpg'))
      .resolves.toEqual([term]);
    expect(harness.provider.generateText).not.toHaveBeenCalled();
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

  it('parses a bilingual design prompt wrapped in a Markdown JSON fence', async () => {
    const harness = createHarness('```json\n{"en":"Soft gradients","zh":"柔和渐变"}\n```');

    await expect(harness.service.generateDesignPrompt('/uploads/design.jpg')).resolves.toEqual({
      en: 'Soft gradients',
      zh: '柔和渐变',
    });
  });

  it('parses LangChain text content blocks for a bilingual design prompt', async () => {
    const harness = createHarness([
      { type: 'text', text: '{"en":"Editorial layout","zh":"杂志式布局"}' },
    ]);

    await expect(harness.service.generateDesignPrompt('/uploads/design.jpg')).resolves.toEqual({
      en: 'Editorial layout',
      zh: '杂志式布局',
    });
  });

  it('propagates provider failures', async () => {
    const harness = createHarness();
    vi.mocked(harness.provider.analyzeImage).mockRejectedValue(new Error('provider failed'));

    await expect(harness.service.generateTerms('/uploads/design.jpg'))
      .rejects.toThrow('provider failed');
  });

  it('attaches raw video output when parsing and repair both fail', async () => {
    const raw = '{"summary":"truncated';
    const harness = createHarness();
    vi.mocked(harness.provider.analyzeVideo).mockResolvedValue(raw);
    vi.mocked(harness.provider.generateText).mockResolvedValue('still invalid');

    await expect(harness.service.analyzeVideo({ videoUrl: 'https://cdn.test/demo.mp4', fps: 3 }))
      .rejects.toMatchObject({ rawResponse: raw });
  });
});
