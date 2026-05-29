# Timeline Retrospective View Implementation Plan

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 添加纵向时间轴视图，按月展示所有收集的灵感缩略图，像翻阅一本设计日记

**架构：** 新增 Timeline 视图模式，后端提供按月查询 API，前端渲染垂直时间轴，每个月一个节点

**技术栈：** React, Framer Motion, Express, Drizzle ORM

---

## 文件结构

- 修改：`server/src/routes/weeks.ts` — 添加按月查询 API
- 创建：`client/src/components/TimelineView.tsx` — 时间轴视图
- 修改：`client/src/App.tsx` — 添加 timeline 视图模式
- 修改：`client/src/components/WeekHeader.tsx` — 添加 timeline 切换按钮
- 修改：`client/src/types/index.ts` — ViewMode 扩展
- 修改：`client/src/i18n/translations.ts` — 添加 timeline 文案

---

### 任务 1：按月查询 API

**文件：**
- 修改：`server/src/routes/weeks.ts`

- [ ] **步骤 1：添加按月查询端点**

在 `server/src/routes/weeks.ts` 中添加：

```typescript
// GET /api/weeks/month/:yearMonth — get all images for a month (e.g., 2024-01)
router.get('/month/:yearMonth', async (req: Request, res: Response) => {
  try {
    const { yearMonth } = req.params;
    const [year, month] = yearMonth.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      res.status(400).json({ error: 'Invalid yearMonth format. Use YYYY-MM' });
      return;
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    // Query all weeks that overlap with this month
    const monthWeeks = await db
      .select()
      .from(weeks)
      .where(and(gte(weeks.weekStart, startDate), lt(weeks.weekStart, endDate)));

    const weekIds = monthWeeks.map((w) => w.id);

    if (weekIds.length === 0) {
      res.json({ month: yearMonth, weeks: [] });
      return;
    }

    // Query images for these weeks
    const monthImages = await db
      .select()
      .from(images)
      .where(inArray(images.weekId, weekIds))
      .orderBy(images.createdAt);

    // Query terms for these images
    const imageIds = monthImages.map((img) => img.id);
    const allTerms = imageIds.length > 0
      ? await db.select().from(termsTable).orderBy(termsTable.position)
      : [];

    const termsByImage: Record<string, any[]> = {};
    for (const term of allTerms) {
      if (!termsByImage[term.imageId]) termsByImage[term.imageId] = [];
      termsByImage[term.imageId].push(term);
    }

    // Group images by week
    const weeksData = monthWeeks.map((week) => ({
      week,
      images: monthImages
        .filter((img) => img.weekId === week.id)
        .map((img) => ({ ...img, terms: termsByImage[img.id] || [] })),
    }));

    res.json({ month: yearMonth, weeks: weeksData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **步骤 2：Commit**

```bash
git add server/src/routes/weeks.ts
git commit -m "feat(server): add monthly timeline query API"
```

---

### 任务 2：前端 API 和类型

**文件：**
- 修改：`client/src/lib/api.ts`
- 修改：`client/src/types/index.ts`

- [ ] **步骤 1：扩展 ViewMode 类型**

```typescript
export type ViewMode = 'day' | 'week' | 'timeline';
```

- [ ] **步骤 2：添加 timeline API 函数**

```typescript
export interface TimelineMonth {
  month: string;
  weeks: { week: Week; images: Image[] }[];
}

export async function fetchMonth(yearMonth: string): Promise<TimelineMonth> {
  const res = await fetch(`${BASE}/weeks/month/${yearMonth}`);
  if (!res.ok) throw new Error('Failed to fetch month');
  return res.json();
}
```

- [ ] **步骤 3：Commit**

```bash
git add client/src/lib/api.ts client/src/types/index.ts
git commit -m "feat(client): add timeline types and API"
```

---

### 任务 3：TimelineView 组件

**文件：**
- 创建：`client/src/components/TimelineView.tsx`

- [ ] **步骤 1：创建时间轴视图**

```tsx
// client/src/components/TimelineView.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { fetchMonth, imageUrl } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import type { TimelineMonth, Image } from '@/types';

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
        Loading...
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
        {/* Vertical line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[var(--card-border)]" />

        {data?.weeks.map((weekData, weekIdx) => (
          <motion.div
            key={weekData.week.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: weekIdx * 0.1 }}
            className="relative pl-16 mb-8"
          >
            {/* Week dot */}
            <div className="absolute left-4 top-2 w-5 h-5 rounded-full bg-[var(--accent)] border-4 border-[var(--background)] shadow-md" />

            {/* Week label */}
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

            {/* Image grid */}
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
                    {/* Hover overlay with first term */}
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

// Helper imports
import { getWeekNumber, formatDateRange } from '@/lib/utils';
```

- [ ] **步骤 2：Commit**

```bash
git add client/src/components/TimelineView.tsx
git commit -m "feat(client): add TimelineView component"
```

---

### 任务 4：集成到 App

**文件：**
- 修改：`client/src/App.tsx`
- 修改：`client/src/components/WeekHeader.tsx`

- [ ] **步骤 1：在 App 中添加 timeline 视图**

导入 TimelineView：
```typescript
import { TimelineView } from '@/components/TimelineView';
```

在视图切换逻辑中添加 timeline：

```tsx
{loading && viewMode === 'week' ? (
  <div className="flex items-center justify-center h-64 text-[var(--text-muted)] text-xl">
    Loading...
  </div>
) : viewMode === 'timeline' ? (
  <TimelineView />
) : viewMode === 'day' ? (
  <DayView key={uploadTick} initialMonday={currentMonday} onRefresh={refresh} />
) : (
  <WeekView weekData={weekData} onRefresh={refresh} />
)}
```

- [ ] **步骤 2：在 WeekHeader 添加 timeline 切换按钮**

在 view mode toggle 区域添加第三个按钮：

```tsx
<button
  onClick={() => onViewModeChange('timeline')}
  className={`p-1.5 rounded-md transition-colors ${
    viewMode === 'timeline'
      ? 'bg-[var(--card)] text-[var(--accent)] shadow-sm'
      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
  }`}
  title={locale === 'zh' ? '时间轴' : 'Timeline'}
>
  <Clock className="w-4 h-4" />
</button>
```

导入 `Clock` 图标。

- [ ] **步骤 3：Commit**

```bash
git add client/src/App.tsx client/src/components/WeekHeader.tsx
git commit -m "feat(client): integrate timeline view into app navigation"
```
