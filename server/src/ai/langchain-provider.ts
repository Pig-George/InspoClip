import { ChatOpenAI } from '@langchain/openai';

import { validateModelConfig, type ModelConfig } from './config.js';
import type {
  ImageModelInput,
  ModelProvider,
  TextModelInput,
  VideoModelInput,
} from './provider.js';

export interface Invoker {
  invoke(input: unknown): Promise<unknown>;
}

export interface InvokerOptions {
  model: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  configuration: {
    baseURL: string;
    fetch?: typeof fetch;
  };
}

export type InvokerFactory = (options: InvokerOptions) => Invoker;

interface ModelResponse {
  content: unknown;
}

type OpenAICompatibleVideoPart = {
  type: 'video_url';
  video_url: {
    url: string;
    fps: number;
    min_pixels?: number;
    max_pixels?: number;
  };
};

const DEFAULT_MAX_TOKENS = 8192;

const defaultInvokerFactory: InvokerFactory = (options) => {
  const model = new ChatOpenAI(options);
  return {
    invoke: (input) => model.invoke(input as Parameters<typeof model.invoke>[0]),
  };
};

function modelContent(response: unknown): unknown {
  if (typeof response === 'object' && response !== null && 'content' in response) {
    return (response as ModelResponse).content;
  }
  return response;
}

function requirePrompt(prompt: string): string {
  const value = prompt.trim();
  if (!value) throw new Error('Prompt must not be empty');
  return value;
}

function requireHttpUrl(value: string, name: string): string {
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`${name} must be a valid HTTP(S) URL`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${name} must be a valid HTTP(S) URL`);
  }
  return trimmed;
}

function imageUrl(input: ImageModelInput): string {
  if ('base64Image' in input && input.base64Image !== undefined) {
    const base64 = input.base64Image.trim();
    if (!base64) throw new Error('Base64 image must not be empty');
    return `data:${input.mimeType};base64,${base64}`;
  }
  return requireHttpUrl(input.imageUrl, 'Image URL');
}

function requireFps(fps: number): number {
  if (!Number.isInteger(fps) || fps < 1 || fps > 5) {
    throw new Error('Video FPS must be an integer between 1 and 5');
  }
  return fps;
}

function requirePixelBounds(
  minPixels: number | undefined,
  maxPixels: number | undefined,
): { min_pixels?: number; max_pixels?: number } {
  if (minPixels !== undefined && (!Number.isSafeInteger(minPixels) || minPixels <= 0)) {
    throw new Error('minPixels must be a positive integer');
  }
  if (maxPixels !== undefined && (!Number.isSafeInteger(maxPixels) || maxPixels <= 0)) {
    throw new Error('maxPixels must be a positive integer');
  }
  if (minPixels !== undefined && maxPixels !== undefined && minPixels > maxPixels) {
    throw new Error('minPixels must be less than or equal to maxPixels');
  }
  return {
    ...(minPixels === undefined ? {} : { min_pixels: minPixels }),
    ...(maxPixels === undefined ? {} : { max_pixels: maxPixels }),
  };
}

export function createLangChainProvider(
  config: ModelConfig,
  factory: InvokerFactory = defaultInvokerFactory,
  clientConfiguration: { fetch?: typeof fetch } = {},
): ModelProvider {
  const validatedConfig = validateModelConfig(config);
  const defaultFps = validatedConfig.fps;
  const invoker = factory({
    model: validatedConfig.model,
    apiKey: validatedConfig.apiKey,
    maxTokens: DEFAULT_MAX_TOKENS,
    temperature: 0.7,
    configuration: {
      baseURL: validatedConfig.baseURL,
      ...clientConfiguration,
    },
  });

  return {
    async analyzeVideo(input: VideoModelInput): Promise<unknown> {
      const prompt = requirePrompt(input.prompt);
      const videoUrl = requireHttpUrl(input.videoUrl, 'Video URL');
      const fps = requireFps(input.fps ?? defaultFps);
      const pixelBounds = requirePixelBounds(input.minPixels, input.maxPixels);
      const videoPart: OpenAICompatibleVideoPart = {
        type: 'video_url',
        video_url: { url: videoUrl, fps, ...pixelBounds },
      };
      const response = await invoker.invoke([
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            videoPart,
          ],
        },
      ]);
      return modelContent(response);
    },

    async analyzeImage(input: ImageModelInput): Promise<unknown> {
      const prompt = requirePrompt(input.prompt);
      const url = imageUrl(input);
      const response = await invoker.invoke([
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url } },
          ],
        },
      ]);
      return modelContent(response);
    },

    async generateText(input: TextModelInput): Promise<unknown> {
      return modelContent(await invoker.invoke(requirePrompt(input.prompt)));
    },
  };
}
