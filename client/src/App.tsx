import { useState, useCallback, useEffect } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { WeekHeader } from '@/components/WeekHeader';
import { DayView } from '@/components/DayView';
import { WeekView } from '@/components/WeekView';
import { ToastContainer, toast } from '@/components/Toast';
import { fetchWeek, uploadImage } from '@/lib/api';
import { getMonday, formatISODate } from '@/lib/utils';
import type { WeekData, ViewMode } from '@/types';

function AppInner() {
  const [currentMonday, setCurrentMonday] = useState(() => getMonday(new Date()));
  const [weekData, setWeekData] = useState<WeekData | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadTick, setUploadTick] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('day');

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

  // Global paste handler — paste image anywhere uploads to today
  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      // Don't intercept when pasting into inputs/textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

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
      setUploading(true);

      try {
        // Compute today's dayOfWeek (0=Mon...6=Sun)
        const now = new Date();
        const dow = now.getDay();
        const dayOfWeek = dow === 0 ? 6 : dow - 1;

        // Get today's week
        const todayMonday = getMonday(now);
        const weekData = await fetchWeek(formatISODate(todayMonday));
        await uploadImage(file, weekData.week.id, dayOfWeek);

        // Navigate to today's week and force DayView refresh
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
    };

    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
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

  return (
    <div className="min-h-screen px-4 py-6 max-w-[1400px] mx-auto">
      <WeekHeader
        monday={currentMonday}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onPrevWeek={viewMode === 'week' ? goToPrevWeek : undefined}
        onNextWeek={viewMode === 'week' ? goToNextWeek : undefined}
      />
      {loading && viewMode === 'week' ? (
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

      {/* Global paste indicator */}
      {uploading && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-full
          bg-[var(--accent)] text-white text-sm font-handwriting shadow-lg animate-pulse">
          Uploading to today...
        </div>
      )}
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
