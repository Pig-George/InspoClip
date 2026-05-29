# Batch Import Implementation Plan

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 支持一次拖入或选择多张图片批量上传，自动分配到今天，显示上传进度

**架构：** 扩展 ImageUploader 支持多文件选择，添加批量上传 API 端点，前端显示逐个上传进度条

**技术栈：** Express, Multer, React, Framer Motion

---

## 文件结构

- 创建：`server/src/routes/batch-upload.ts` — 批量上传 API
- 修改：`server/src/index.ts:80-84` — 注册路由
- 修改：`client/src/lib/api.ts` — 添加批量上传函数
- 创建：`client/src/components/BatchUploader.tsx` — 批量上传组件
- 修改：`client/src/components/DayColumn.tsx:94-103` — 集成 BatchUploader
- 修改：`client/src/i18n/translations.ts` — 添加批量上传文案

---

### 任务 1：批量上传 API

**文件：**
- 创建：`server/src/routes/batch-upload.ts`
- 修改：`server/src/index.ts`

- [ ] **步骤 1：创建批量上传路由**

```typescript
// server/src/routes/batch-upload.ts
import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { images, terms as termsTable } from '../db/schema.js';
import { upload } from '../middleware/upload.js';
import { generateTerms } from '../services/ai.js';

const router = Router();

router.post('/', upload.array('images', 20), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No image files provided' });
      return;
    }

    const { weekId, dayOfWeek } = req.body;
    if (!weekId || dayOfWeek === undefined) {
      res.status(400).json({ error: 'weekId and dayOfWeek are required' });
      return;
    }

    const decorations = ['tape', 'pin', 'clip', 'washi', 'stitch', 'staple', 'sticker', 'corner'];
    const results: any[] = [];

    for (const file of files) {
      const decoration = decorations[Math.floor(Math.random() * decorations.length)];

      const [image] = await db
        .insert(images)
        .values({
          weekId,
          dayOfWeek: parseInt(dayOfWeek),
          filePath: file.filename,
          decoration,
        })
        .returning();

      // Generate terms in background (don't block batch)
      generateTerms(file.path)
        .then(async (keywords) => {
          if (keywords.length > 0) {
            await db.insert(termsTable).values(
              keywords.map((kw, i) => ({ imageId: image.id, keyword: kw, position: i }))
            );
          }
        })
        .catch((err) => {
          console.error(`AI failed for ${image.id}:`, err.message);
          db.insert(termsTable).values({ imageId: image.id, keyword: 'design element', position: 0 });
        });

      results.push({ ...image, terms: [] });
    }

    res.json({ uploaded: results.length, images: results });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
```

- [ ] **步骤 2：注册路由**

在 `server/src/index.ts` 中：
```typescript
import batchUploadRouter from './routes/batch-upload.js';
// ...
app.use('/api/batch-upload', batchUploadRouter);
```

- [ ] **步骤 3：Commit**

```bash
git add server/src/routes/batch-upload.ts server/src/index.ts
git commit -m "feat(server): add batch upload API endpoint"
```

---

### 任务 2：前端批量上传 API 函数

**文件：**
- 修改：`client/src/lib/api.ts`

- [ ] **步骤 1：添加批量上传函数**

```typescript
export async function batchUploadImages(
  files: File[],
  weekId: string,
  dayOfWeek: number,
  onProgress?: (current: number, total: number) => void
): Promise<any[]> {
  // Upload in parallel batches of 3
  const batchSize = 3;
  const results: any[] = [];

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        const result = await uploadImage(file, weekId, dayOfWeek);
        return result;
      })
    );
    results.push(...batchResults);
    onProgress?.(Math.min(i + batchSize, files.length), files.length);
  }

  return results;
}
```

- [ ] **步骤 2：Commit**

```bash
git add client/src/lib/api.ts
git commit -m "feat(client): add batch upload API function"
```

---

### 任务 3：BatchUploader 组件

**文件：**
- 创建：`client/src/components/BatchUploader.tsx`

- [ ] **步骤 1：创建组件**

```tsx
// client/src/components/BatchUploader.tsx
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, CheckCircle } from 'lucide-react';
import { batchUploadImages } from '@/lib/api';
import { toast } from '@/components/Toast';
import { useLanguage } from '@/context/LanguageContext';
import { setLastUploadedImageId } from '@/lib/events';

interface BatchUploaderProps {
  weekId: string;
  dayOfWeek: number;
  onUploaded: () => void;
}

export function BatchUploader({ weekId, dayOfWeek, onUploaded }: BatchUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t, locale } = useLanguage();

  const handleFiles = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setUploading(true);
    setProgress({ current: 0, total: imageFiles.length });

    try {
      const results = await batchUploadImages(imageFiles, weekId, dayOfWeek, (current, total) => {
        setProgress({ current, total });
      });

      if (results.length > 0) {
        setLastUploadedImageId(results[results.length - 1].id);
      }

      toast('success', locale === 'zh'
        ? `成功导入 ${results.length} 张图片`
        : `Imported ${results.length} images`);

      onUploaded();
    } catch (err: any) {
      toast('error', err.message || 'Batch upload failed');
    } finally {
      setUploading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed transition-colors ${
        dragOver
          ? 'border-[var(--accent)] bg-[var(--accent)]/5'
          : 'border-[var(--card-border)] hover:border-[var(--accent)]/50'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50"
      >
        <Upload className="w-4 h-4" />
        {uploading
          ? (locale === 'zh' ? `上传中 ${progress.current}/${progress.total}` : `Uploading ${progress.current}/${progress.total}`)
          : (locale === 'zh' ? '批量导入图片' : 'Batch import images')
        }
      </button>

      {uploading && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--muted)] rounded-b-lg overflow-hidden">
          <motion.div
            className="h-full bg-[var(--accent)]"
            initial={{ width: 0 }}
            animate={{ width: `${(progress.current / progress.total) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **步骤 2：Commit**

```bash
git add client/src/components/BatchUploader.tsx
git commit -m "feat(client): add BatchUploader component"
```

---

### 任务 4：在 DayColumn 集成 BatchUploader

**文件：**
- 修改：`client/src/components/DayColumn.tsx:94-103`

- [ ] **步骤 1：在 DayColumn footer 中添加批量上传入口**

导入 BatchUploader：
```typescript
import { BatchUploader } from './BatchUploader';
```

在 sticky footer 中，`<ImageUploader>` 之后添加批量上传按钮（仅 today 可用）：

```tsx
<div className="sticky bottom-0 z-10 px-4 py-3 border-t border-[var(--card-border)] bg-[var(--card)] space-y-2">
  {canUpload ? (
    <>
      <ImageUploader weekId={weekId} dayOfWeek={dayOfWeek} onUploaded={onRefresh} />
      <BatchUploader weekId={weekId} dayOfWeek={dayOfWeek} onUploaded={onRefresh} />
    </>
  ) : (
    <p className="text-[11px] text-[var(--text-muted)] text-center font-handwriting opacity-40">
      {locale === 'zh' ? '仅今日可上传' : 'Upload only today'}
    </p>
  )}
</div>
```

- [ ] **步骤 2：Commit**

```bash
git add client/src/components/DayColumn.tsx
git commit -m "feat(client): integrate BatchUploader in DayColumn"
```
