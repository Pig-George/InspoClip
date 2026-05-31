import { useState, useCallback, useEffect } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { WeekHeader } from '@/components/WeekHeader';
import { DayView } from '@/components/DayView';
import { WeekView } from '@/components/WeekView';
import { TimelineView } from '@/components/TimelineView';
import { ToastContainer, toast } from '@/components/Toast';
import { fetchWeek, uploadImage, checkSimilarity } from '@/lib/api';
import type { SimilarImage } from '@/lib/api';
import { setLastUploadedImageId } from '@/lib/events';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLanguage } from '@/context/LanguageContext';
import { SimilarityConfirmDialog } from '@/components/SimilarityConfirmDialog';
import { getMonday, formatISODate } from '@/lib/utils';
import type { WeekData, ViewMode } from '@/types';

function AppInner() {
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTick, setUploadTick] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [searchOpen, setSearchOpen] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [pasteSimilarOpen, setPasteSimilarOpen] = useState(false);
  const [pasteSimilarImages, setPasteSimilarImages] = useState<SimilarImage[]>([]);
  const pendingPasteRef = useState<{ file: File; weekId: string; dayOfWeek: number } | null>(null);
  const { locale } = useLanguage();

  const loadWeek = useCallback(async (monday: Date) => {
    setLoading(true);
    try {
      const data = await fetchWeek(formatISODate(monday));
      setWeekData(data);
    } catch (err) {
      console.error('Failed to load week:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWeek(currentMonday);
  }, [currentMonday, loadWeek]);

  // Helper: perform the actual upload
  const doPasteUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const now = new Date();
      const dow = now.getDay();
      const dayOfWeek = dow === 0 ? 6 : dow - 1;
      const todayMonday = getMonday(now);
      const weekData = await fetchWeek(formatISODate(todayMonday));
      const result = await uploadImage(file, weekData.week.id, dayOfWeek);
      if (result?.id) setLastUploadedImageId(result.id);
      setCurrentMonday(todayMonday);
      setUploadTick((t) => t + 1);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('413') || msg.includes('too large') || msg.includes('size')) {
        toast('error', '图片过大，请压缩后再试');
      } else {
        toast('error', `上传失败: ${msg}`);
      }
    } finally {
      setUploading(false);
    }
  }, []);

  // Global paste handler — check similarity before upload
  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      let file: File | null = null;
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          file = item.getAsFile();
          break;
        }
      }
      if (!file) return;

      e.preventDefault();

      // Check similarity first
      try {
        const similar = await checkSimilarity(file);
        if (similar.length > 0) {
          // Store pending file and show confirmation
          const now = new Date();
          const dow = now.getDay();
          const dayOfWeek = dow === 0 ? 6 : dow - 1;
          const todayMonday = getMonday(now);
          const weekData = await fetchWeek(formatISODate(todayMonday));
          pendingPasteRef.current = { file, weekId: weekData.week.id, dayOfWeek };
          setPasteSimilarImages(similar);
          setPasteSimilarOpen(true);
          return;
        }
      } catch {
        // If check fails, proceed with upload
      }

      doPasteUpload(file);
    };

    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [doPasteUpload]);

  // Similarity confirm/cancel for paste
  const handlePasteConfirm = useCallback(async () => {
    setPasteSimilarOpen(false);
    setPasteSimilarImages([]);
    const pending = pendingPasteRef.current;
    pendingPasteRef.current = null;
    if (!pending) return;

    setUploading(true);
    try {
      const result = await uploadImage(pending.file, pending.weekId, pending.dayOfWeek);
      if (result?.id) setLastUploadedImageId(result.id);
      setCurrentMonday(getMonday(new Date()));
      setUploadTick((t) => t + 1);
    } catch (err: any) {
      toast('error', `上传失败: ${err?.message || err}`);
    } finally {
      setUploading(false);
    }
  }, []);

  const handlePasteCancel = useCallback(() => {
    setPasteSimilarOpen(false);
    setPasteSimilarImages([]);
    pendingPasteRef.current = null;
  }, []);

  const goToPrevWeek = () => {
    const prev = new Date(currentMonday);
    prev.setDate(prev.getDate() - 7);
    setCurrentMonday(prev);
  };

  const goToNextWeek = () => {
    const next = new Date(currentMonday);
    next.setDate(next.getDate() + 7);
    setCurrentMonday(next);
  };

  const refresh = () => loadWeek(currentMonday);

  useKeyboardShortcuts({
    onPrevWeek: viewMode === 'week' ? goToPrevWeek : undefined,
    onNextWeek: viewMode === 'week' ? goToNextWeek : undefined,
    onOpenSearch: () => setSearchOpen(true),
    onCloseDialog: () => {
      setSearchOpen(false);
      setShowShortcutHelp(false);
    },
    onSwitchDayView: () => setViewMode('day'),
    onSwitchWeekView: () => setViewMode('week'),
    onGoToToday: () => setCurrentMonday(getMonday(new Date())),
    onShowHelp: () => setShowShortcutHelp((v) => !v),
  });

  return (
    <div className="min-h-screen px-4 py-6 max-w-[1400px] mx-auto">
      <WeekHeader
        monday={currentMonday}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onPrevWeek={viewMode === 'week' ? goToPrevWeek : undefined}
        onNextWeek={viewMode === 'week' ? goToNextWeek : undefined}
        searchOpen={searchOpen}
        onSearchOpenChange={setSearchOpen}
      />
      {viewMode === 'timeline' ? (
        <TimelineView />
      ) : loading && viewMode === 'week' ? (
        <div className="flex items-center justify-center h-64 text-[var(--text-muted)] text-xl">
          Loading...
        </div>
      ) : viewMode === 'day' ? (
        <DayView key={uploadTick} initialMonday={currentMonday} onRefresh={refresh} />
      ) : (
        <WeekView
          weekData={weekData}
          onRefresh={refresh}
        />
      )}

      {/* Toast notifications */}
      <ToastContainer />

      {/* Keyboard shortcuts help */}
      {showShortcutHelp && (
        <div
          data-dialog-overlay
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40"
          onClick={() => setShowShortcutHelp(false)}
        >
          <div
            className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] shadow-2xl p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-heading font-semibold text-[var(--text)] mb-4">
              {locale === 'zh' ? '快捷键' : 'Keyboard Shortcuts'}
            </h2>
            <div className="space-y-2 text-sm">
              {[
                { keys: ['←', '→'], desc: locale === 'zh' ? '切换日期' : 'Navigate days/weeks' },
                { keys: ['/'], desc: locale === 'zh' ? '搜索' : 'Search' },
                { keys: ['D'], desc: locale === 'zh' ? '日视图' : 'Day view' },
                { keys: ['W'], desc: locale === 'zh' ? '周视图' : 'Week view' },
                { keys: ['T'], desc: locale === 'zh' ? '跳转今天' : 'Go to today' },
                { keys: ['?'], desc: locale === 'zh' ? '显示帮助' : 'Show help' },
                { keys: ['Esc'], desc: locale === 'zh' ? '关闭' : 'Close' },
              ].map((item) => (
                <div key={item.keys.join('')} className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">{item.desc}</span>
                  <div className="flex gap-1">
                    {item.keys.map((k) => (
                      <kbd
                        key={k}
                        className="px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--text)] text-xs font-mono border border-[var(--card-border)]"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Global paste indicator */}
      {uploading && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-full
          bg-[var(--accent)] text-white text-sm font-handwriting shadow-lg animate-pulse">
          Uploading to today...
        </div>
      )}

      {/* Similarity confirmation for paste upload */}
      <SimilarityConfirmDialog
        open={pasteSimilarOpen}
        similarImages={pasteSimilarImages}
        onConfirm={handlePasteConfirm}
        onCancel={handlePasteCancel}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppInner />
      </LanguageProvider>
    </ThemeProvider>
  );
}
