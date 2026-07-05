export interface ImageModelInput {
  imageUrl: string;
  prompt: string;
}

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
