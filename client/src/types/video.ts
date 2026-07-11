export type VideoJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type VideoPurpose = 'general' | 'video-generation' | 'frontend' | 'motion-design' | 'storyboard' | 'json';

export interface LocalizedText { en: string; zh: string }
export type LocalizedString = string | LocalizedText;

export interface VideoTag { id: string; name: string; color: string }
export interface VideoAction { subject: LocalizedString; action: LocalizedString; from: Record<string, unknown>; to: Record<string, unknown>; durationMs: number; delayMs: number; easing: string }
export interface VideoStage { startTime: number; endTime: number; title: LocalizedString; initialState: LocalizedString; trigger: LocalizedString; actions: VideoAction[]; resultState: LocalizedString }
export interface VideoAnalysis {
  summary: LocalizedString;
  visualStyle: { colors: string[]; typography: string; layout: string; effects: string[] };
  stages: VideoStage[];
  assets: string[];
  uncertainties: string[];
}
export interface VideoRecord { id: string; weekId: string | null; dayOfWeek: number | null; sortOrder: number; filePath: string; thumbnailPath: string | null; originalName: string; mimeType: string; sizeBytes: number; durationMs: number; width: number; height: number; source: 'client' | 'extension'; createdAt: string }
export interface VideoJob { id: string; videoId: string; status: VideoJobStatus; progress: number; model: string; fps: number; attemptCount: number; errorMessage: string | null }
export interface WeekVideo extends VideoRecord { job: VideoJob | null; summary: LocalizedString | null; tags: VideoTag[] }
export interface VideoUploadResult { videoId: string; jobId: string; status: VideoJobStatus }
export interface VideoDetail { video: VideoRecord; job: VideoJob | null; analysis: VideoAnalysis | null; summary: LocalizedString | null; tags: VideoTag[] }
export interface VideoPromptOutput { id: string; purpose: VideoPurpose; target: string; contentEn: string; contentZh: string }
