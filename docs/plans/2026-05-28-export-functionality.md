# Export Functionality Implementation Plan

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 支持将某一周/月的灵感导出为 PDF、Markdown 或 JSON，方便备份或迁移到其他工具

**架构：** 后端提供导出 API，使用 sharp 拼接图片 + 生成 PDF（使用 pdfkit），前端提供导出按钮和格式选择

**技术栈：** pdfkit (新依赖), sharp (已有), React

---

## 文件结构

- 修改：`server/package.json` — 添加 pdfkit 依赖
- 创建：`server/src/routes/export.ts` — 导出 API
- 修改：`server/src/index.ts` — 注册路由
- 修改：`client/src/lib/api.ts` — 添加导出函数
- 创建：`client/src/components/ExportDialog.tsx` — 导出对话框
- 修改：`client/src/components/WeekHeader.tsx` — 添加导出按钮
- 修改：`client/src/i18n/translations.ts` — 添加导出文案

---

### 任务 1：安装 pdfkit 依赖

**文件：**
- 修改：`server/package.json`

- [ ] **步骤 1：安装依赖**

```bash
cd server && npm install pdfkit @types/pdfkit
```

- [ ] **步骤 2：Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "feat(server): add pdfkit dependency for PDF export"
```

---

### 任务 2：导出 API

**文件：**
- 创建：`server/src/routes/export.ts`
- 修改：`server/src/index.ts`

- [ ] **步骤 1：创建导出路由**

```typescript
// server/src/routes/export.ts
import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { weeks, images, terms as termsTable } from '../db/schema.js';
import { eq, and, gte, lt, inArray, sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// GET /api/export/week/:date?format=markdown|json
router.get('/week/:date', async (req: Request, res: Response) => {
  try {
    const dateStr = req.params.date;
    const format = (req.query.format as string) || 'markdown';
    const monday = getMonday(new Date(dateStr + 'T00:00:00'));
    const mondayStr = formatDate(monday);

    const [week] = await db.select().from(weeks).where(eq(weeks.weekStart, mondayStr)).limit(1);
    if (!week) {
      res.status(404).json({ error: 'Week not found' });
      return;
    }

    const weekImages = await db.select().from(images).where(eq(images.weekId, week.id)).orderBy(images.dayOfWeek, images.createdAt);
    const imageIds = weekImages.map((img) => img.id);

    const allTerms = imageIds.length > 0
      ? await db.select().from(termsTable).where(inArray(termsTable.imageId, imageIds)).orderBy(termsTable.position)
      : [];

    const termsByImage: Record<string, string[]> = {};
    for (const term of allTerms) {
      if (!termsByImage[term.imageId]) termsByImage[term.imageId] = [];
      termsByImage[term.imageId].push(term.keyword);
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    if (format === 'json') {
      const data = {
        week: mondayStr,
        exportedAt: new Date().toISOString(),
        images: weekImages.map((img) => ({
          day: dayNames[img.dayOfWeek],
          filePath: img.filePath,
          terms: termsByImage[img.id] || [],
        })),
      };
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="inspoclip-${mondayStr}.json"`);
      res.json(data);
    } else {
      // Markdown export
      let md = `# InspoClip - Week of ${mondayStr}\n\n`;
      md += `> Exported on ${new Date().toISOString()}\n\n`;

      const byDay: Record<number, typeof weekImages> = {};
      for (const img of weekImages) {
        if (!byDay[img.dayOfWeek]) byDay[img.dayOfWeek] = [];
        byDay[img.dayOfWeek].push(img);
      }

      for (let d = 0; d < 7; d++) {
        const dayImages = byDay[d] || [];
        if (dayImages.length === 0) continue;

        md += `## ${dayNames[d]}\n\n`;
        for (const img of dayImages) {
          const terms = termsByImage[img.id] || [];
          md += `- ![${terms[0] || 'image'}](uploads/${img.filePath})\n`;
          if (terms.length > 0) {
            md += `  - Tags: ${terms.join(', ')}\n`;
          }
          md += '\n';
        }
      }

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="inspoclip-${mondayStr}.md"`);
      res.send(md);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/export/week/:date/pdf
router.get('/week/:date/pdf', async (req: Request, res: Response) => {
  try {
    const PDFDocument = (await import('pdfkit')).default;

    const dateStr = req.params.date;
    const monday = getMonday(new Date(dateStr + 'T00:00:00'));
    const mondayStr = formatDate(monday);

    const [week] = await db.select().from(weeks).where(eq(weeks.weekStart, mondayStr)).limit(1);
    if (!week) {
      res.status(404).json({ error: 'Week not found' });
      return;
    }

    const weekImages = await db.select().from(images).where(eq(images.weekId, week.id)).orderBy(images.dayOfWeek, images.createdAt);
    const imageIds = weekImages.map((img) => img.id);

    const allTerms = imageIds.length > 0
      ? await db.select().from(termsTable).where(inArray(termsTable.imageId, imageIds)).orderBy(termsTable.position)
      : [];

    const termsByImage: Record<string, string[]> = {};
    for (const term of allTerms) {
      if (!termsByImage[term.imageId]) termsByImage[term.imageId] = [];
      termsByImage[term.imageId].push(term.keyword);
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="inspoclip-${mondayStr}.pdf"`);
    doc.pipe(res);

    // Title
    doc.fontSize(24).text(`InspoClip - Week of ${mondayStr}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text(`Exported on ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(1);

    const byDay: Record<number, typeof weekImages> = {};
    for (const img of weekImages) {
      if (!byDay[img.dayOfWeek]) byDay[img.dayOfWeek] = [];
      byDay[img.dayOfWeek].push(img);
    }

    for (let d = 0; d < 7; d++) {
      const dayImages = byDay[d] || [];
      if (dayImages.length === 0) continue;

      doc.fillColor('#333').fontSize(14).text(dayNames[d]);
      doc.moveDown(0.3);

      for (const img of dayImages) {
        const terms = termsByImage[img.id] || [];
        const imgPath = path.join(uploadDir, img.filePath);

        try {
          await fs.access(imgPath);
          // Resize image to fit page width
          const maxWidth = 200;
          doc.image(imgPath, { width: maxWidth });
          doc.moveDown(0.2);
        } catch {
          doc.fontSize(9).fillColor('#999').text(`[Image: ${img.filePath}]`);
        }

        if (terms.length > 0) {
          doc.fontSize(9).fillColor('#666').text(terms.join(' | '));
        }
        doc.moveDown(0.5);
      }

      doc.moveDown(0.5);
    }

    doc.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default router;
```

- [ ] **步骤 2：注册路由**

在 `server/src/index.ts` 中：
```typescript
import exportRouter from './routes/export.js';
// ...
app.use('/api/export', exportRouter);
```

- [ ] **步骤 3：Commit**

```bash
git add server/src/routes/export.ts server/src/index.ts
git commit -m "feat(server): add export API (JSON, Markdown, PDF)"
```

---

### 任务 3：前端导出组件

**文件：**
- 修改：`client/src/lib/api.ts`
- 创建：`client/src/components/ExportDialog.tsx`
- 修改：`client/src/components/WeekHeader.tsx`

- [ ] **步骤 1：添加 API 函数**

```typescript
export function exportWeekUrl(dateStr: string, format: 'json' | 'markdown' | 'pdf'): string {
  if (format === 'pdf') return `${BASE}/export/week/${dateStr}/pdf`;
  return `${BASE}/export/week/${dateStr}?format=${format}`;
}
```

- [ ] **步骤 2：创建 ExportDialog 组件**

```tsx
// client/src/components/ExportDialog.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileJson, FileText, FileImage, X } from 'lucide-react';
import { exportWeekUrl } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { useScrollLock } from '@/hooks/useScrollLock';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  weekDate: string;
}

export function ExportDialog({ open, onClose, weekDate }: ExportDialogProps) {
  const overlayRef = useScrollLock(open);
  const { locale } = useLanguage();

  const formats = [
    {
      key: 'pdf' as const,
      icon: FileImage,
      label: locale === 'zh' ? 'PDF 文档' : 'PDF Document',
      desc: locale === 'zh' ? '含图片的精美文档' : 'Document with images',
    },
    {
      key: 'markdown' as const,
      icon: FileText,
      label: locale === 'zh' ? 'Markdown' : 'Markdown',
      desc: locale === 'zh' ? '纯文本格式，适合 Notion' : 'Plain text, great for Notion',
    },
    {
      key: 'json' as const,
      icon: FileJson,
      label: 'JSON',
      desc: locale === 'zh' ? '结构化数据，便于迁移' : 'Structured data for migration',
    },
  ];

  const handleExport = (format: 'pdf' | 'markdown' | 'json') => {
    const url = exportWeekUrl(weekDate, format);
    window.open(url, '_blank');
    onClose();
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        data-dialog-overlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 10 }}
          className="w-full max-w-sm mx-4 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] shadow-2xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading font-semibold text-[var(--text)]">
              {locale === 'zh' ? '导出灵感' : 'Export Inspirations'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[var(--muted)]">
              <X className="w-5 h-5 text-[var(--text-muted)]" />
            </button>
          </div>

          <div className="space-y-2">
            {formats.map((f) => {
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => handleExport(f.key)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-[var(--card-border)]
                    hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="text-sm font-heading font-semibold text-[var(--text)]">{f.label}</p>
                    <p className="text-xs text-[var(--text-muted)]">{f.desc}</p>
                  </div>
                  <Download className="w-4 h-4 text-[var(--text-muted)] ml-auto" />
                </button>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **步骤 3：在 WeekHeader 添加导出按钮**

在 WeekHeader 的 right actions 区域添加导出按钮：

```tsx
import { Download } from 'lucide-react';
import { ExportDialog } from './ExportDialog';

// 在组件内部
const [exportOpen, setExportOpen] = useState(false);

// 在搜索按钮之前添加
<button
  onClick={() => setExportOpen(true)}
  className="p-2 rounded-full hover:bg-[var(--muted)] transition-colors"
  aria-label="Export"
>
  <Download className="w-5 h-5 text-[var(--accent)]" />
</button>

// 在 SettingsDialog 之后
<ExportDialog
  open={exportOpen}
  onClose={() => setExportOpen(false)}
  weekDate={formatISODate(monday)}
/>
```

- [ ] **步骤 4：Commit**

```bash
git add client/src/lib/api.ts client/src/components/ExportDialog.tsx client/src/components/WeekHeader.tsx
git commit -m "feat(client): add export dialog with PDF/Markdown/JSON options"
```
