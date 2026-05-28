import { useEffect, useCallback } from 'react';

interface ShortcutHandlers {
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onOpenSearch?: () => void;
  onCloseDialog?: () => void;
  onSwitchDayView?: () => void;
  onSwitchWeekView?: () => void;
  onGoToToday?: () => void;
  onShowHelp?: () => void;
}

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable;
}

function isDialogOpen(): boolean {
  return !!document.querySelector('[data-dialog-overlay]');
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handlers.onCloseDialog?.();
        return;
      }

      if (isInputFocused()) return;
      if (isDialogOpen()) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlers.onPrevWeek?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handlers.onNextWeek?.();
          break;
        case '/':
          e.preventDefault();
          handlers.onOpenSearch?.();
          break;
        case 'd':
          handlers.onSwitchDayView?.();
          break;
        case 'w':
          handlers.onSwitchWeekView?.();
          break;
        case 't':
          handlers.onGoToToday?.();
          break;
        case '?':
          handlers.onShowHelp?.();
          break;
      }
    },
    [handlers]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
