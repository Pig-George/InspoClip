export type VideoJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type VideoPurpose = 'general' | 'video-generation' | 'frontend' | 'motion-design' | 'storyboard' | 'json';

export interface VideoAction { subject: string; action: string; from: Record<string, unknown>; to: Record<string, unknown>; durationMs: number; delayMs: number; easing: string }
export interface VideoStage { startTime: number; endTime: number; title: string; initialState: string; trigger: string; actions: VideoAction[]; resultState: string }
export interface VideoAnalysis {
  summary: string;
  visualStyle: { colors: string[]; typography: string; layout: string; effects: string[] };
  stages: VideoStage[];
  assets: string[];
  uncertainties: string[];
}
export interface VideoRecord { id: string; filePath: string; thumbnailPath: string | null; originalName: string; mimeType: string; sizeBytes: number; durationMs: number; width: number; height: number; source: 'client' | 'extension'; createdAt: string }
export interface VideoJob { id: string; videoId: string; status: VideoJobStatus; progress: number; model: string; fps: number; attemptCount: number; errorMessage: string | null }
export interface VideoUploadResult { videoId: string; jobId: string; status: VideoJobStatus }
export interface VideoDetail { video: VideoRecord; job: VideoJob | null; analysis: VideoAnalysis | null }
export interface VideoPromptOutput { id: string; purpose: VideoPurpose; target: string; locale: string; content: string }
