import { describe, expect, it, vi } from 'vitest';

import type { ModelConfig } from './config.js';
import { createLangChainProvider, type InvokerFactory } from './langchain-provider.js';
import type { ModelProvider } from './provider.js';

const config: ModelConfig = {
  provider: 'openai-compatible',
  apiKey: 'test-key',
  baseURL: 'https://example.test/v1',
  model: 'qwen3.7-plus',
  fps: 3,
};

function createHarness(content: unknown = '{"ok":true}') {
  const invoke = vi.fn().mockResolvedValue({ content });
  const factory = vi.fn(() => ({ invoke })) as InvokerFactory;
  const provider = createLangChainProvider(config, factory);
  return { factory, invoke, provider };
}

describe('createLangChainProvider', () => {
  it('requests JSON object mode and parses model content before returning it', async () => {
    const { invoke, provider } = createHarness('{"en":"Prompt","zh":"提示词"}');

    await expect(provider.generateText({ prompt: 'Create a prompt' })).resolves.toEqual({
      en: 'Prompt',
      zh: '提示词',
    });
    expect(invoke).toHaveBeenCalledWith('Create a prompt');
  });

  it('configures ChatOpenAI-compatible model parameters', () => {
    const { factory } = createHarness();

    expect(factory).toHaveBeenCalledWith({
      model: 'qwen3.7-plus',
      apiKey: 'test-key',
      maxTokens: 8192,
      temperature: 0.7,
      timeout: 90_000,
      configuration: { baseURL: 'https://example.test/v1' },
    });
  });

  it('keeps the legacy 300-token limit for image analysis', async () => {
    const defaultInvoke = vi.fn().mockResolvedValue({ content: 'default' });
    const imageInvoke = vi.fn().mockResolvedValue({ content: '{"terms":["image"]}' });
    const factory = vi.fn((options: Parameters<InvokerFactory>[0]) => ({
      invoke: options.maxTokens === 300 ? imageInvoke : defaultInvoke,
    })) as InvokerFactory;
    const provider = createLangChainProvider(config, factory);

    await provider.analyzeImage({
      imageUrl: 'https://cdn.test/image.png',
      prompt: 'Describe the visual style',
    });

    expect(factory).toHaveBeenCalledWith({
      model: 'qwen3.7-plus',
      apiKey: 'test-key',
      maxTokens: 300,
      temperature: 0.7,
      timeout: 90_000,
      configuration: { baseURL: 'https://example.test/v1' },
    });
    expect(imageInvoke).toHaveBeenCalledOnce();
    expect(defaultInvoke).not.toHaveBeenCalled();
  });

  it('lets an explicit video fps override the configured default', async () => {
    const { invoke, provider } = createHarness();

    await provider.analyzeVideo({
      videoUrl: 'https://cdn.test/demo.mp4',
      fps: 4,
      prompt: 'Analyze the transitions',
    });

    expect(invoke).toHaveBeenCalledWith([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze the transitions' },
          {
            type: 'video_url',
            video_url: { url: 'https://cdn.test/demo.mp4', fps: 4 },
          },
        ],
      },
    ]);
  });

  it('uses the configured fps when the video request does not override it', async () => {
    const { invoke, provider } = createHarness();

    await provider.analyzeVideo({
      videoUrl: 'https://cdn.test/demo.mp4',
      prompt: 'Analyze the transitions',
    });

    expect(invoke.mock.calls[0]?.[0][0].content[1]).toEqual({
      type: 'video_url',
      video_url: { url: 'https://cdn.test/demo.mp4', fps: 3 },
    });
  });

  it('preserves Qwen video pixel bounds in the invoker request', async () => {
    const { invoke, provider } = createHarness();

    await provider.analyzeVideo({
      videoUrl: 'https://cdn.test/demo.mp4',
      fps: 4,
      minPixels: 3136,
      maxPixels: 12845056,
      prompt: 'Analyze the transitions',
    });

    expect(invoke.mock.calls[0]?.[0][0].content[1]).toEqual({
      type: 'video_url',
      video_url: {
        url: 'https://cdn.test/demo.mp4',
        fps: 4,
        min_pixels: 3136,
        max_pixels: 12845056,
      },
    });
  });

  it('uses OpenAI image_url content for image requests', async () => {
    const { invoke, provider } = createHarness();

    await provider.analyzeImage({
      imageUrl: 'https://cdn.test/image.png',
      prompt: 'Describe the visual style',
    });

    expect(invoke).toHaveBeenCalledWith([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe the visual style' },
          { type: 'image_url', image_url: { url: 'https://cdn.test/image.png' } },
        ],
      },
    ]);
  });

  it('converts typed base64 image data to an OpenAI data URL', async () => {
    const { invoke, provider } = createHarness();

    await provider.analyzeImage({
      base64Image: 'cG5nLWJ5dGVz',
      mimeType: 'image/png',
      prompt: 'Describe the visual style',
    });

    expect(invoke).toHaveBeenCalledWith([
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Describe the visual style' },
          {
            type: 'image_url',
            image_url: { url: 'data:image/png;base64,cG5nLWJ5dGVz' },
          },
        ],
      },
    ]);
  });

  it('uses plain text for text requests', async () => {
    const { invoke, provider } = createHarness();

    await provider.generateText({ prompt: 'Rewrite this copy' });

    expect(invoke).toHaveBeenCalledWith('Rewrite this copy');
  });

  it('rejects non-object model JSON responses', async () => {
    const rawContent = [{ type: 'text', text: 'structured response' }];
    const { provider } = createHarness(rawContent);

    await expect(provider.generateText({ prompt: 'Hello' }))
      .rejects.toThrow('invalid JSON object');
  });

  it('satisfies the business provider contract', async () => {
    const { provider } = createHarness('{"result":"typed result"}');
    const businessProvider: ModelProvider = provider;

    await expect(
      businessProvider.generateText({ prompt: 'contract test' }),
    ).resolves.toEqual({ result: 'typed result' });
  });

  it('rejects invalid endpoints before constructing an invoker', () => {
    const factory = vi.fn(() => ({ invoke: vi.fn() })) as InvokerFactory;

    expect(() =>
      createLangChainProvider({ ...config, baseURL: 'file:///tmp/exfiltrate' }, factory),
    ).toThrow('HTTP(S)');
    expect(factory).not.toHaveBeenCalled();
  });

  it('allows configuration loading without a key but rejects provider construction', () => {
    const factory = vi.fn(() => ({ invoke: vi.fn() })) as InvokerFactory;

    expect(() => createLangChainProvider({ ...config, apiKey: '' }, factory)).toThrow(
      'AI API key',
    );
    expect(factory).not.toHaveBeenCalled();
  });

  it.each(['', 'file:///tmp/video.mp4', 'data:video/mp4;base64,abc'])(
    'rejects an invalid video URL %s',
    async (videoUrl) => {
      const { invoke, provider } = createHarness();

      await expect(provider.analyzeVideo({ videoUrl, fps: 3, prompt: 'Analyze' }))
        .rejects.toThrow('HTTP(S)');
      expect(invoke).not.toHaveBeenCalled();
    },
  );

  it.each([Number.NaN, 0, 6, 2.5])('rejects invalid video fps %s', async (fps) => {
    const { invoke, provider } = createHarness();

    await expect(provider.analyzeVideo({
      videoUrl: 'https://cdn.test/video.mp4',
      fps,
      prompt: 'Analyze',
    })).rejects.toThrow('FPS');
    expect(invoke).not.toHaveBeenCalled();
  });

  it.each([
    [{ minPixels: 0 }, 'minPixels'],
    [{ minPixels: 1.5 }, 'minPixels'],
    [{ maxPixels: 0 }, 'maxPixels'],
    [{ maxPixels: 2.5 }, 'maxPixels'],
    [{ minPixels: Number.MAX_SAFE_INTEGER + 1 }, 'minPixels'],
    [{ maxPixels: Number.MAX_SAFE_INTEGER + 1 }, 'maxPixels'],
    [{ minPixels: 200, maxPixels: 100 }, 'minPixels'],
  ])('rejects invalid video pixel bounds %#', async (bounds, message) => {
    const { invoke, provider } = createHarness();

    await expect(provider.analyzeVideo({
      videoUrl: 'https://cdn.test/video.mp4',
      fps: 3,
      prompt: 'Analyze',
      ...bounds,
    })).rejects.toThrow(message);
    expect(invoke).not.toHaveBeenCalled();
  });

  it('rejects empty prompts for every operation', async () => {
    const { invoke, provider } = createHarness();

    await expect(provider.analyzeVideo({
      videoUrl: 'https://cdn.test/video.mp4', fps: 3, prompt: '  ',
    })).rejects.toThrow('Prompt');
    await expect(provider.analyzeImage({
      imageUrl: 'https://cdn.test/image.png', prompt: '',
    })).rejects.toThrow('Prompt');
    await expect(provider.generateText({ prompt: '\n' })).rejects.toThrow('Prompt');
    expect(invoke).not.toHaveBeenCalled();
  });

  it.each(['', 'file:///tmp/image.png', 'data:image/png;base64,abc'])(
    'rejects an invalid image URL %s',
    async (imageUrl) => {
      const { invoke, provider } = createHarness();

      await expect(provider.analyzeImage({ imageUrl, prompt: 'Analyze' }))
        .rejects.toThrow('HTTP(S)');
      expect(invoke).not.toHaveBeenCalled();
    },
  );

  it('preserves video_url and fps in the default ChatOpenAI HTTP body', async () => {
    const fetchSpy = vi.fn(async (..._args: Parameters<typeof fetch>) =>
      new Response(JSON.stringify({
        choices: [{ message: { role: 'assistant', content: '{"ok":true}' } }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }));
    const provider = createLangChainProvider({ ...config, fps: 4 }, undefined, {
      fetch: fetchSpy as unknown as typeof fetch,
    });

    await provider.analyzeVideo({
      videoUrl: 'https://cdn.test/demo.mp4',
      minPixels: 3136,
      maxPixels: 12845056,
      prompt: 'Analyze the transitions',
    });

    expect(fetchSpy).toHaveBeenCalledOnce();
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(init.body));

    expect(body.messages[0].content[1]).toEqual({
      type: 'video_url',
      video_url: {
        url: 'https://cdn.test/demo.mp4',
        fps: 4,
        min_pixels: 3136,
        max_pixels: 12845056,
      },
    });
    expect(body.max_tokens).toBe(8192);
    expect(body.temperature).toBe(0.7);
    expect(body.response_format).toEqual({ type: 'json_object' });
  });
});
