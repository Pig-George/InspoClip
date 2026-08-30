import { WorkspaceNotesEditor } from '@inspoclip/workspace-ui';
import { useLanguage } from '@/context/LanguageContext';

interface NotesAreaProps {
  content: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  height: number;
  onResizeMouseDown: (e: React.MouseEvent) => void;
  resizeRef: React.Ref<HTMLDivElement>;
}

export function NotesArea({
  content,
  onChange,
  onBlur,
  height,
  onResizeMouseDown,
  resizeRef,
}: NotesAreaProps) {
  const { t } = useLanguage();
  return <WorkspaceNotesEditor label={t('Notes')} placeholder={t('NotesPlaceholder')} content={content} onChange={onChange} onBlur={onBlur} height={height} onResize={onResizeMouseDown} resizeRef={resizeRef} />;
}
