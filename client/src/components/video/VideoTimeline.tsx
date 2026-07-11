import { useLanguage } from '@/context/LanguageContext';
import type { Locale } from '@/i18n/translations';
import { localizedText } from '@/lib/localized-text';
import type { VideoStage } from '@/types/video';

interface VideoTimelineProps {
  stages: VideoStage[];
  onSelect: (stage: VideoStage) => void;
  locale?: Locale;
}

export function VideoTimeline({ stages, onSelect, locale: localeOverride }: VideoTimelineProps) {
  const { locale: currentLocale } = useLanguage();
  const locale = localeOverride ?? currentLocale;

  return (
    <div className="space-y-2" aria-label="视频阶段时间线">
      {stages.map((stage, index) => (
        <button
          key={`${stage.startTime}-${index}`}
          onClick={() => onSelect(stage)}
          className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-left hover:border-[var(--accent)]"
        >
          <div className="flex items-center justify-between gap-3">
            <strong className="text-sm text-[var(--text)]">
              {index + 1}. {localizedText(stage.title, locale)}
            </strong>
            <span className="shrink-0 text-xs text-[var(--text-muted)]">
              {stage.startTime.toFixed(1)}s — {stage.endTime.toFixed(1)}s
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {localizedText(stage.initialState, locale)} → {localizedText(stage.trigger, locale)} → {localizedText(stage.resultState, locale)}
          </p>
          {stage.actions.map((action, actionIndex) => (
            <p key={actionIndex} className="mt-1 text-xs text-[var(--text)]">
              {localizedText(action.subject, locale)}：{localizedText(action.action, locale)} · {action.durationMs}ms · {action.easing}
            </p>
          ))}
        </button>
      ))}
    </div>
  );
}
