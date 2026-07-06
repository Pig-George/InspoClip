import { describe, expect, it, vi } from 'vitest';

import {
  createAnthropicImageProvider,
  createGeminiImageProvider,
} from './native-image-providers.js';

const imageInput = {
  base64Image: 'aW1hZ2UtYnl0ZXM=',
  mimeType: 'image/png' as const,
  prompt: 'Analyze this image',
};

describe('native image providers', () => {
  it('sends Gemini native inline image data and returns its text', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '["term"]' }] } }],
    }), { status: 200 }));
    const provider = createGeminiImageProvider(
      { apiKey: 'gemini-key', model: 'gemini-2.5-pro' },
      fetcher as typeof fetch,
    );

    await expect(provider.analyzeImage(imageInput)).resolves.toBe('["term"]');

    expect(fetcher).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': 'gemini-key',
        },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: 'Analyze this image' },
            { inline_data: { mime_type: 'image/png', data: 'aW1hZ2UtYnl0ZXM=' } },
          ] }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
        }),
      },
    );
  });

  it('URL-encodes the Gemini model path segment', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: '' }] } }],
    }), { status: 200 }));
    const provider = createGeminiImageProvider(
      { apiKey: 'key', model: 'models/custom name' },
      fetcher as typeof fetch,
    );

    await provider.analyzeImage(imageInput);

    expect(fetcher).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/models%2Fcustom%20name:generateContent',
      expect.any(Object),
    );
  });

  it('joins Gemini text blocks and ignores thinking blocks', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      candidates: [{ content: { parts: [
        { thought: true, text: 'hidden reasoning' },
        { text: '["first"' },
        { type: 'tool_call', name: 'ignored' },
        { text: ',"second"]' },
      ] } }],
    }), { status: 200 }));
    const provider = createGeminiImageProvider(
      { apiKey: 'key', model: 'gemini' },
      fetcher as typeof fetch,
    );

    await expect(provider.analyzeImage(imageInput)).resolves.toBe('["first","second"]');
  });

  it('joins all Anthropic text blocks and ignores thinking blocks', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      content: [
        { type: 'thinking', thinking: 'hidden reasoning' },
        { type: 'text', text: '{"en":"clean",' },
        { type: 'text', text: '"zh":"简洁"}' },
      ],
    }), { status: 200 }));
    const provider = createAnthropicImageProvider(
      { apiKey: 'key', baseURL: 'https://anthropic.test/v1', model: 'claude' },
      fetcher as typeof fetch,
    );

    await expect(provider.analyzeImage(imageInput))
      .resolves.toBe('{"en":"clean","zh":"简洁"}');
  });

  it.each([
    ['Gemini', () => createGeminiImageProvider(
      { apiKey: 'key', model: 'gemini' },
      vi.fn(async () => new Response('{"candidates":[{"content":{"parts":[{"thought":true}]}}]}')) as typeof fetch,
    )],
    ['Anthropic', () => createAnthropicImageProvider(
      { apiKey: 'key', baseURL: 'https://anthropic.test/v1', model: 'claude' },
      vi.fn(async () => new Response('{"content":[{"type":"thinking","thinking":"secret"}]}')) as typeof fetch,
    )],
  ])('throws for malformed %s responses without text', async (_name, createProvider) => {
    await expect(createProvider().analyzeImage(imageInput)).rejects.toThrow('text');
  });

  it('sends Anthropic native base64 image data and returns its text', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({
      content: [{ text: '{"en":"clean","zh":"简洁"}' }],
    }), { status: 200 }));
    const provider = createAnthropicImageProvider(
      {
        apiKey: 'anthropic-key',
        baseURL: 'https://anthropic.test/v1',
        model: 'claude-sonnet-4-5',
      },
      fetcher as typeof fetch,
    );

    await expect(provider.analyzeImage(imageInput))
      .resolves.toBe('{"en":"clean","zh":"简洁"}');

    expect(fetcher).toHaveBeenCalledWith('https://anthropic.test/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'anthropic-key',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 300,
        messages: [{ role: 'user', content: [
          { type: 'text', text: 'Analyze this image' },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: 'aW1hZ2UtYnl0ZXM=',
            },
          },
        ] }],
      }),
    });
  });

  it('propagates native provider HTTP failures', async () => {
    const fetcher = vi.fn(async () => new Response('quota exceeded', { status: 429 }));
    const provider = createGeminiImageProvider(
      { apiKey: 'gemini-key', model: 'gemini-2.5-pro' },
      fetcher as typeof fetch,
    );

    await expect(provider.analyzeImage(imageInput)).rejects.toThrow('429');
  });
});
