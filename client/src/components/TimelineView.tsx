import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { fetchMonth, imageUrl } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { getWeekNumber, formatDateRange } from '@/lib/utils';
import type { TimelineMonth } from '@/types';

export function TimelineView() {
  const [data, setData] = useState<TimelineMonth | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(false);
  const { locale } = useLanguage();

  const loadMonth = useCallback(async (month: string) => {
    setLoading(true);
    try {
      const result = await fetchMonth(month);
      setData(result);
    } catch (err) {
      console.error('Failed to load month:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonth(currentMonth);
  }, [currentMonth, loadMonth]);

  const goToPrevMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
    setCurrentMonth(prev);
  };

  const goToNextMonth = () => {
    const [y, m] = currentMonth.split('-').map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    const now = new Date();
    const maxMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (next <= maxMonth) setCurrentMonth(next);
  };

  const formatMonth = (monthStr: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    const date = new Date(y, m - 1);
    return date.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'long',
    });
  };

  const totalImages = data?.weeks.reduce((sum, w) => sum + w.images.length, 0) || 0;

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-muted)] text-xl font-handwriting">
        {locale === 'zh' ? '加载中...' : 'Loading...'}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={goToPrevMonth}
          className="p-2 rounded-full hover:bg-[var(--muted)] transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-[var(--accent)]" />
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-heading font-bold text-[var(--text)]">
            {formatMonth(currentMonth)}
          </h2>
          <p className="text-sm text-[var(--text-muted)] font-handwriting">
            {locale === 'zh'
              ? `共 ${totalImages} 张灵感`
              : `${totalImages} inspirations`}
          </p>
        </div>

        <button
          onClick={goToNextMonth}
          className="p-2 rounded-full hover:bg-[var(--muted)] transition-colors"
        >
          <ChevronRight className="w-6 h-6 text-[var(--accent)]" />
        </button>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[var(--card-border)]" />

        {data?.weeks.map((weekData, weekIdx) => (
          <motion.div
            key={weekData.week.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: weekIdx * 0.1 }}
            className="relative pl-16 mb-8"
          >
            <div className="absolute left-4 top-2 w-5 h-5 rounded-full bg-[var(--accent)] border-4 border-[var(--background)] shadow-md" />

            <div className="mb-3">
              <span className="text-sm font-heading font-semibold text-[var(--accent)]">
                {locale === 'zh'
                  ? `第 ${getWeekNumber(new Date(weekData.week.weekStart))} 周`
                  : `Week ${getWeekNumber(new Date(weekData.week.weekStart))}`}
              </span>
              <span className="ml-2 text-xs text-[var(--text-muted)] font-handwriting">
                {formatDateRange(new Date(weekData.week.weekStart))}
              </span>
            </div>

            {weekData.images.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {weekData.images.map((image, imgIdx) => (
                  <motion.div
                    key={image.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: weekIdx * 0.1 + imgIdx * 0.05 }}
                    className="aspect-square rounded-lg overflow-hidden border border-[var(--card-border)] shadow-sm
                      hover:shadow-md hover:scale-105 transition-all cursor-pointer group"
                  >
                    <img
                      src={imageUrl(image.filePath)}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {image.terms.length > 0 && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity
                        flex items-end p-1.5">
                        <span className="text-[10px] text-white font-term truncate">
                          {image.terms[0].keyword.split(' / ')[0]}
                        </span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)] font-handwriting opacity-50">
                {locale === 'zh' ? '本周无灵感' : 'No inspirations this week'}
              </p>
            )}
          </motion.div>
        ))}

        {data?.weeks.length === 0 && (
          <div className="text-center py-16 text-[var(--text-muted)]">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-handwriting">
              {locale === 'zh' ? '本月暂无灵感记录' : 'No inspirations this month'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
