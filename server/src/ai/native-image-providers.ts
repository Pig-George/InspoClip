import type { ImageMimeType, ImageModelInput, ModelProvider } from './provider.js';
import { IMAGE_TERMINOLOGY_PROMPT } from './prompts.js';

interface GeminiImageConfig {
  apiKey: string;
  model: string;
}

interface AnthropicImageConfig extends GeminiImageConfig {
  baseURL: string;
}

interface ImageData {
  base64Image: string;
  mimeType: ImageMimeType;
}

export function createGeminiImageProvider(
  config: GeminiImageConfig,
  fetcher: typeof fetch = fetch,
): ModelProvider {
  requireConfig(config.apiKey, config.model);
  return imageOnlyProvider(async (input) => {
    const image = requireImageData(input);
    const response = await fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: input.prompt },
            { inline_data: { mime_type: image.mimeType, data: image.base64Image } },
          ] }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
        }),
      },
    );
    if (!response.ok) {
      if (input.prompt === IMAGE_TERMINOLOGY_PROMPT) {
        throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
      }
      throw new Error(`Gemini error ${response.status}`);
    }
    return geminiText(await response.json());
  });
}

export function createAnthropicImageProvider(
  config: AnthropicImageConfig,
  fetcher: typeof fetch = fetch,
): ModelProvider {
  requireConfig(config.apiKey, config.model);
  return imageOnlyProvider(async (input) => {
    const image = requireImageData(input);
    const response = await fetcher(`${config.baseURL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 300,
        messages: [{ role: 'user', content: [
          { type: 'text', text: input.prompt },
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: image.mimeType,
              data: image.base64Image,
            },
          },
        ] }],
      }),
    });
    if (!response.ok) {
      if (input.prompt === IMAGE_TERMINOLOGY_PROMPT) {
        throw new Error(`Anthropic API error ${response.status}: ${await response.text()}`);
      }
      throw new Error(`Anthropic error ${response.status}`);
    }
    return anthropicText(await response.json());
  });
}

function imageOnlyProvider(analyzeImage: ModelProvider['analyzeImage']): ModelProvider {
  const unsupported = async (): Promise<never> => {
    throw new Error('This provider only supports image analysis');
  };
  return { analyzeImage, analyzeVideo: unsupported, generateText: unsupported };
}

function requireConfig(apiKey: string, model: string): void {
  if (!apiKey.trim()) throw new Error('AI API key must not be empty');
  if (!model.trim()) throw new Error('AI model must not be empty');
}

function requireImageData(input: ImageModelInput): ImageData {
  if (!('base64Image' in input) || input.base64Image === undefined) {
    throw new Error('Native image provider requires base64 image data');
  }
  if (!input.base64Image) throw new Error('Base64 image must not be empty');
  return { base64Image: input.base64Image, mimeType: input.mimeType };
}

function geminiText(value: unknown): string {
  if (!isRecord(value) || !Array.isArray(value.candidates)) {
    throw new Error('Gemini response did not contain text content');
  }
  const texts: string[] = [];
  let foundText = false;
  for (const candidate of value.candidates) {
    if (!isRecord(candidate) || !isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) {
      continue;
    }
    for (const part of candidate.content.parts) {
      if (!isRecord(part) || part.thought === true || typeof part.text !== 'string') continue;
      foundText = true;
      texts.push(part.text);
    }
  }
  if (!foundText) throw new Error('Gemini response did not contain a text block');
  return texts.join('').trim();
}

function anthropicText(value: unknown): string {
  if (!isRecord(value) || !Array.isArray(value.content)) {
    throw new Error('Anthropic response did not contain text content');
  }
  const texts: string[] = [];
  let foundText = false;
  for (const content of value.content) {
    if (
      !isRecord(content)
      || (content.type !== undefined && content.type !== 'text')
      || typeof content.text !== 'string'
    ) {
      continue;
    }
    foundText = true;
    texts.push(content.text);
  }
  if (!foundText) throw new Error('Anthropic response did not contain a text block');
  return texts.join('').trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
