export interface LocalizedText {
  en: string;
  zh: string;
}

export type LocalizedString = string | LocalizedText;

export interface VisualStyle {
  colors: string[];
  typography: string;
  layout: string;
  effects: string[];
}

export interface VideoAction {
  subject: LocalizedString;
  action: LocalizedString;
  from: Record<string, unknown>;
  to: Record<string, unknown>;
  durationMs: number;
  delayMs: number;
  easing: string;
}

export interface VideoStage {
  startTime: number;
  endTime: number;
  title: LocalizedString;
  initialState: LocalizedString;
  trigger: LocalizedString;
  actions: VideoAction[];
  resultState: LocalizedString;
}

export interface VideoAnalysis {
  summary: LocalizedString;
  visualStyle: VisualStyle;
  stages: VideoStage[];
  assets: string[];
  uncertainties: string[];
}
