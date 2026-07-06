export type ImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

interface ImagePromptInput {
  prompt: string;
}

export type ImageModelInput = ImagePromptInput & (
  | { imageUrl: string; base64Image?: never; mimeType?: never }
  | { imageUrl?: never; base64Image: string; mimeType: ImageMimeType }
);

export interface VideoModelInput {
  videoUrl: string;
  fps?: number;
  minPixels?: number;
  maxPixels?: number;
  prompt: string;
}

export interface TextModelInput {
  prompt: string;
}

export interface ModelProvider {
  analyzeImage(input: ImageModelInput): Promise<unknown>;
  analyzeVideo(input: VideoModelInput): Promise<unknown>;
  generateText(input: TextModelInput): Promise<unknown>;
}
