import type { VideoStage } from '@/types/video';

export function VideoTimeline({ stages, onSelect }: { stages: VideoStage[]; onSelect: (stage: VideoStage) => void }) {
  return <div className="space-y-2" aria-label="视频阶段时间线">
    {stages.map((stage, index) => <button key={`${stage.startTime}-${index}`} onClick={() => onSelect(stage)} className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-3 text-left hover:border-[var(--accent)]">
      <div className="flex items-center justify-between"><strong>{index + 1}. {stage.title}</strong><span className="text-xs text-[var(--text-muted)]">{stage.startTime.toFixed(1)}s – {stage.endTime.toFixed(1)}s</span></div>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{stage.initialState} → {stage.trigger} → {stage.resultState}</p>
      {stage.actions.map((action, actionIndex) => <p key={actionIndex} className="mt-1 text-xs">{action.subject}：{action.action} · {action.durationMs}ms · {action.easing}</p>)}
    </button>)}
  </div>;
}
