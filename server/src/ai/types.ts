export interface VisualStyle {
  colors: string[];
  typography: string;
  layout: string;
  effects: string[];
}

export interface VideoAction {
  subject: string;
  action: string;
  from: Record<string, unknown>;
  to: Record<string, unknown>;
  durationMs: number;
  delayMs: number;
  easing: string;
}

export interface VideoStage {
  startTime: number;
  endTime: number;
  title: string;
  initialState: string;
  trigger: string;
  actions: VideoAction[];
  resultState: string;
}

export interface VideoAnalysis {
  summary: string;
  visualStyle: VisualStyle;
  stages: VideoStage[];
  assets: string[];
  uncertainties: string[];
}
