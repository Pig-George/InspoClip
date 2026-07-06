import { readFile } from 'node:fs/promises';

import sharp from 'sharp';

import type { ImageMimeType, ModelProvider } from './provider.js';
import { DESIGN_ANALYSIS_PROMPT, IMAGE_TERMINOLOGY_PROMPT } from './prompts.js';

const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 80;

export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
}

export interface ImageProcessor {
  metadata(image: Buffer): Promise<ImageMetadata>;
  resizeToJpeg(image: Buffer, maxDimension: number, quality: number): Promise<Buffer>;
}

export interface AiServiceDependencies {
  readFile(path: string): Promise<Buffer>;
  imageProcessor: ImageProcessor;
}

const defaultDependencies: AiServiceDependencies = {
  readFile,
  imageProcessor: {
    async metadata(image) {
      const metadata = await sharp(image).metadata();
      return { width: metadata.width, height: metadata.height, format: metadata.format };
    },
    async resizeToJpeg(image, maxDimension, quality) {
      return sharp(image)
        .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality })
        .toBuffer();
    },
  },
};

interface PreparedImage {
  base64Image: string;
  mimeType: ImageMimeType;
}

export class AiService {
  constructor(
    private readonly provider: ModelProvider,
    private readonly dependencies: AiServiceDependencies = defaultDependencies,
  ) {}

  async generateTerms(imagePath: string): Promise<string[]> {
    const image = await this.prepareImage(imagePath);
    const response = await this.provider.analyzeImage({
      ...image,
      prompt: IMAGE_TERMINOLOGY_PROMPT,
    });
    return parseTerms(responseText(response));
  }

  async generateDesignPrompt(imagePath: string): Promise<{ en: string; zh: string }> {
    const image = await this.prepareImage(imagePath);
    const response = await this.provider.analyzeImage({
      ...image,
      prompt: DESIGN_ANALYSIS_PROMPT,
    });
    return parseDesignPrompt(responseText(response));
  }

  private async prepareImage(imagePath: string): Promise<PreparedImage> {
    const original = await this.dependencies.readFile(imagePath);
    const fallback: PreparedImage = {
      base64Image: original.toString('base64'),
      mimeType: fallbackMimeFromPath(imagePath),
    };

    try {
      const metadata = await this.dependencies.imageProcessor.metadata(original);

      const isLarge =
        (metadata.width !== undefined && metadata.width > MAX_IMAGE_DIMENSION)
        || (metadata.height !== undefined && metadata.height > MAX_IMAGE_DIMENSION);
      const nativeMimeType = supportedMimeType(metadata.format);
      if (isLarge || nativeMimeType === undefined) {
        const jpeg = await this.dependencies.imageProcessor.resizeToJpeg(
          original,
          MAX_IMAGE_DIMENSION,
          JPEG_QUALITY,
        );
        return { base64Image: jpeg.toString('base64'), mimeType: 'image/jpeg' };
      }

      return { base64Image: original.toString('base64'), mimeType: nativeMimeType };
    } catch {
      return fallback;
    }
  }
}

function supportedMimeType(format: string | undefined): ImageMimeType | undefined {
  if (format === 'png') return 'image/png';
  if (format === 'jpeg' || format === 'jpg') return 'image/jpeg';
  if (format === 'webp') return 'image/webp';
  if (format === 'gif') return 'image/gif';
  return undefined;
}

function fallbackMimeFromPath(imagePath: string): ImageMimeType {
  const lowerPath = imagePath.toLowerCase();
  if (lowerPath.endsWith('.png')) return 'image/png';
  if (lowerPath.endsWith('.webp')) return 'image/webp';
  if (lowerPath.endsWith('.gif')) return 'image/gif';
  if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) return 'image/jpeg';
  return 'image/jpeg';
}

function responseText(response: unknown): string {
  if (typeof response === 'string') return response;
  return response === null || response === undefined ? '' : String(response);
}

function parseTerms(text: string): string[] {
  try {
    const parsed: unknown = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 10).map((term) => String(term));
    }
  } catch {
    // Preserve the legacy comma/newline fallback for non-JSON model output.
  }

  return text
    .replace(/[\[\]"]/g, '')
    .split(/[,\n]/)
    .map((term) => term.trim())
    .filter(Boolean)
    .slice(0, 10);
}

function parseDesignPrompt(text: string): { en: string; zh: string } {
  const trimmed = text.trim();
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed === 'object' && parsed !== null) {
      const values = parsed as Record<string, unknown>;
      return {
        en: typeof values.en === 'string' ? values.en : '',
        zh: typeof values.zh === 'string' ? values.zh : '',
      };
    }
  } catch {
    // Preserve the legacy bilingual raw-text fallback.
  }
  return { en: trimmed, zh: trimmed };
}
