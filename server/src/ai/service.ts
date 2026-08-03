import { readFile } from 'node:fs/promises';

import sharp from 'sharp';
import { z } from 'zod';

import type { ImageMimeType, ModelProvider } from './provider.js';
import { DESIGN_ANALYSIS_PROMPT, IMAGE_TERMINOLOGY_JSON_OBJECT_INSTRUCTION, IMAGE_TERMINOLOGY_PROMPT, VIDEO_ANALYSIS_PROMPT, createImageTerminologyRepairPrompt, createPurposeTransformationPrompt, type Purpose, type PurposeOptions } from './prompts.js';
import { parseVideoAnalysis } from './parser.js';
import type { VideoAnalysis } from './types.js';

const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 80;
const MAX_TERMINOLOGY_LENGTH = 80;
const terminologyOutputSchema = z.object({ terms: z.array(z.string()).min(1).max(10) }).strict();
const bilingualPromptSchema = z.object({ en: z.string().min(1), zh: z.string().min(1) }).strict();

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

export interface RawModelOutputError extends Error {
  rawResponse?: string;
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
      prompt: `${IMAGE_TERMINOLOGY_PROMPT}\n${IMAGE_TERMINOLOGY_JSON_OBJECT_INSTRUCTION}`,
    });
    const terms = parseTerms(response);
    if (terms.every(isConciseTerm)) return terms;

    const repairedResponse = await this.provider.generateText({
      prompt: `${createImageTerminologyRepairPrompt(terms)}\n${IMAGE_TERMINOLOGY_JSON_OBJECT_INSTRUCTION}`,
    });
    const repairedTerms = parseTerms(repairedResponse).filter(isConciseTerm);
    if (repairedTerms.length > 0) return repairedTerms;

    return terms.filter(isConciseTerm);
  }

  async generateDesignPrompt(imagePath: string): Promise<{ en: string; zh: string }> {
    const image = await this.prepareImage(imagePath);
    const response = await this.provider.analyzeImage({
      ...image,
      prompt: DESIGN_ANALYSIS_PROMPT,
    });
    return parseDesignPrompt(response);
  }

  async analyzeVideo(input: { videoUrl: string; fps?: number; minPixels?: number; maxPixels?: number }): Promise<{ analysis: VideoAnalysis; rawResponse: string }> {
    const response = await this.provider.analyzeVideo({ ...input, prompt: VIDEO_ANALYSIS_PROMPT });
    const rawResponse = serializedResponse(response);
    try {
      return { analysis: parseVideoResponse(response), rawResponse };
    } catch (firstError) {
      const repairPrompt = `Repair the following untrusted model output so it matches the required video analysis JSON schema. Return JSON only.\nSchema instructions:\n${VIDEO_ANALYSIS_PROMPT}\nUntrusted output:\n${JSON.stringify(rawResponse)}`;
      const repaired = await this.provider.generateText({ prompt: repairPrompt });
      try {
        return { analysis: parseVideoResponse(repaired), rawResponse };
      } catch {
        if (firstError instanceof Error) {
          (firstError as RawModelOutputError).rawResponse = rawResponse;
        }
        throw firstError;
      }
    }
  }

  async generateVideoOutput(analysis: VideoAnalysis, purpose: Purpose = 'general', options: PurposeOptions = {}): Promise<{ en: string; zh: string }> {
    const prompt = `${createPurposeTransformationPrompt(purpose, options)}\nSource analysis JSON:\n${JSON.stringify(analysis)}`;
    return parseVideoPromptOutput(await this.provider.generateText({ prompt }));
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

function parseVideoResponse(response: unknown): VideoAnalysis {
  if (isRecord(response)) return parseVideoAnalysis(response);
  const text = responseText(response);
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return parseVideoAnalysis(JSON.parse(cleaned));
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
  if (Array.isArray(response)) {
    return response
      .map((block) => {
        if (
          typeof block === 'object'
          && block !== null
          && 'text' in block
          && typeof block.text === 'string'
        ) {
          return block.text;
        }
        return typeof block === 'string' ? block : '';
      })
      .join('');
  }
  return response === null || response === undefined ? '' : String(response);
}

function serializedResponse(response: unknown): string {
  return typeof response === 'string' ? response : JSON.stringify(response);
}

function parseTerms(response: unknown): string[] {
  if (isRecord(response)) {
    return terminologyOutputSchema.parse(response).terms;
  }
  const text = responseText(response);
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

function isConciseTerm(term: string): boolean {
  const normalized = term.trim();
  return normalized.length > 0
    && normalized.length <= MAX_TERMINOLOGY_LENGTH
    && !/(?:[!?。！？；;]|\.(?=\s+\/|\s*$))/.test(normalized);
}

function parseDesignPrompt(response: unknown): { en: string; zh: string } {
  if (isRecord(response)) {
    return bilingualPromptSchema.parse(response);
  }
  const text = responseText(response);
  const trimmed = text.trim();
  const jsonText = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    const parsed: unknown = JSON.parse(jsonText);
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

function parseVideoPromptOutput(response: unknown): { en: string; zh: string } {
  if (isRecord(response)) return parseDesignPrompt(response);
  const text = responseText(response);
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return parseDesignPrompt(trimmed);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
