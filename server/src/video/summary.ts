import type { LocalizedString } from '../ai/types.js';

interface AnalysisSummarySource {
  summary?: string | null;
  analysis?: unknown;
}

export function cardSummaryFromAnalysis(source: AnalysisSummarySource | null | undefined): LocalizedString | null {
  const analysisSummary = summaryFromUnknownAnalysis(source?.analysis);
  return analysisSummary ?? source?.summary ?? null;
}

function summaryFromUnknownAnalysis(analysis: unknown): LocalizedString | null {
  if (!analysis || typeof analysis !== 'object' || !('summary' in analysis)) return null;
  const summary = (analysis as { summary?: unknown }).summary;
  if (typeof summary === 'string') return summary;
  if (summary && typeof summary === 'object') {
    const { en, zh } = summary as { en?: unknown; zh?: unknown };
    if (typeof en === 'string' || typeof zh === 'string') {
      return {
        en: typeof en === 'string' ? en : '',
        zh: typeof zh === 'string' ? zh : '',
      };
    }
  }
  return null;
}
