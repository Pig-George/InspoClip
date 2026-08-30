import { useLanguage } from '@/context/LanguageContext';
import type { Locale } from '@/i18n/translations';
import { WorkspaceStageList, type WorkspaceStageItem } from '@inspoclip/workspace-ui';
import type { VideoStage } from '@/types/video';

interface VideoTimelineProps {
  stages: VideoStage[];
  onSelect: (stage: VideoStage) => void;
  locale?: Locale;
}

export function VideoTimeline({ stages, onSelect, locale: localeOverride }: VideoTimelineProps) {
  const { locale: currentLocale } = useLanguage();
  const locale = localeOverride ?? currentLocale;
  const sharedStages: WorkspaceStageItem[] = stages.map((stage, index) => ({
    id: `${stage.startTime}-${index}`,
    title: stage.title,
    startSeconds: stage.startTime,
    endSeconds: stage.endTime,
    initialState: stage.initialState,
    trigger: stage.trigger,
    resultState: stage.resultState,
    actions: stage.actions.map((action) => ({
      subject: action.subject,
      action: action.action,
      durationMs: action.durationMs,
      easing: action.easing,
    })),
    data: stage,
  }));

  return (
    <WorkspaceStageList
      stages={sharedStages}
      locale={locale}
      onSelect={(_, index) => onSelect(stages[index])}
      stepSeparator=" → "
      actionSeparator={locale === 'zh' ? '：' : ': '}
    />
  );
}
