# Image Similarity Detection Implementation Plan

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 上传图片时检测是否已有高度相似的图片，避免重复收集

**架构：** 使用 perceptual hash (pHash) 算法，上传时计算图片哈希并存储，新图片上传时与已有哈希比较汉明距离

**技术栈：** sharp (已有), 无需额外依赖, Drizzle ORM, React

---

## 文件结构

- 创建：`server/src/services/phash.ts` — perceptual hash 实现
- 修改：`server/src/db/schema.ts` — images 表添加 phash 字段
- 修改：`server/src/index.ts` — initDB 添加字段
- 修改：`server/src/routes/images.ts` — 上传时检测相似
- 修改：`client/src/lib/api.ts` — 添加相似检查 API
- 创建：`client/src/components/SimilarityWarning.tsx` — 相似警告组件
- 修改：`client/src/components/ImageUploader.tsx` — 集成相似检测
- 修改：`client/src/i18n/translations.ts` — 添加相关文案

---

### 任务 1：Perceptual Hash 服务

**文件：**
- 创建：`server/src/services/phash.ts`

- [ ] **步骤 1：实现 pHash 算法**

```typescript
// server/src/services/phash.ts
import sharp from 'sharp';

/**
 * Compute a perceptual hash (pHash) for an image.
 * Returns a 64-bit hash as a hex string.
 *
 * Algorithm:
 * 1. Resize to 32x32 grayscale
 * 2. Apply DCT (simplified: use 8x8 block averages)
 * 3. Compute median of the 64 values
 * 4. Convert to binary hash (above median = 1, below = 0)
 * 5. Return as 16-char hex string
 */
export async function computePhash(imagePath: string): Promise<string> {
  // Step 1: Resize to 32x32 grayscale
  const { data } = await sharp(imagePath)
    .resize(32, 32, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Step 2: Compute 8x8 block averages (simplified DCT)
  const blockSize = 4; // 32/8
  const blocks: number[] = [];

  for (let by = 0; by < 8; by++) {
    for (let bx = 0; bx < 8; bx++) {
      let sum = 0;
      let count = 0;
      for (let y = by * blockSize; y < (by + 1) * blockSize; y++) {
        for (let x = bx * blockSize; x < (bx + 1) * blockSize; x++) {
          sum += data[y * 32 + x];
          count++;
        }
      }
      blocks.push(sum / count);
    }
  }

  // Step 3: Compute median
  const sorted = [...blocks].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Step 4: Convert to binary hash
  let hash = 0n;
  for (let i = 0; i < 64; i++) {
    if (blocks[i] > median) {
      hash |= 1n << BigInt(63 - i);
    }
  }

  // Step 5: Return as hex
  return hash.toString(16).padStart(16, '0');
}

/**
 * Compute Hamming distance between two hex hash strings.
 * Returns number of differing bits (0 = identical, 64 = completely different).
 */
export function hammingDistance(hash1: string, hash2: string): number {
  const big1 = BigInt(`0x${hash1}`);
  const big2 = BigInt(`0x${hash2}`);
  let xor = big1 ^ big2;
  let distance = 0;
  while (xor > 0n) {
    distance += Number(xor & 1n);
    xor >>= 1n;
  }
  return distance;
}

/**
 * Check if two images are similar based on perceptual hash.
 * Threshold: 10 bits difference out of 64 (configurable).
 */
export function areSimilar(hash1: string, hash2: string, threshold: number = 10): boolean {
  return hammingDistance(hash1, hash2) <= threshold;
}
```

- [ ] **步骤 2：Commit**

```bash
git add server/src/services/phash.ts
git commit -m "feat(server): add perceptual hash similarity detection"
```

---

### 任务 2：数据库 — images 表添加 phash 字段

**文件：**
- 修改：`server/src/db/schema.ts`
- 修改：`server/src/index.ts`

- [ ] **步骤 1：在 images 表添加 phash 字段**

在 `server/src/db/schema.ts` 的 images 表定义中添加：

```typescript
phash: text('phash'), // perceptual hash for similarity detection
```

在 `server/src/index.ts` 的 initDB SQL 中，修改 images 表：

```sql
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL,
  file_path TEXT NOT NULL,
  decoration TEXT NOT NULL,
  phash TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] **步骤 2：Commit**

```bash
git add server/src/db/schema.ts server/src/index.ts
git commit -m "feat(server): add phash column to images table"
```

---

### 任务 3：上传时检测相似

**文件：**
- 修改：`server/src/routes/images.ts`

- [ ] **步骤 1：在图片上传时计算 phash 并检测相似**

在 `server/src/routes/images.ts` 中导入：

```typescript
import { computePhash, areSimilar } from '../services/phash.js';
```

在上传处理函数中，插入图片记录之后、AI 生成之前：

```typescript
// Compute perceptual hash
let phash = '';
try {
  phash = await computePhash(file.path);
  // Update image with phash
  await db.update(images).set({ phash }).where(eq(images.id, image.id));

  // Check for similar images
  const allImages = await db.select({ id: images.id, phash: images.phash, filePath: images.filePath })
    .from(images)
    .where(sql`${images.phash} IS NOT NULL AND ${images.id} != ${image.id}`);

  const similar = allImages
    .filter((img) => img.phash && areSimilar(phash, img.phash))
    .slice(0, 3);

  if (similar.length > 0) {
    // Include similar images in response
    (image as any).similarImages = similar.map((s) => ({ id: s.id, filePath: s.filePath }));
  }
} catch (err: any) {
  console.warn('[Phash] Failed:', err.message);
}
```

- [ ] **步骤 2：添加相似查询 API 端点**

```typescript
// GET /api/images/:id/similar — find similar images
router.get('/:id/similar', async (req: Request, res: Response) => {
  try {
    const [image] = await db.select().from(images).where(eq(images.id, req.params.id)).limit(1);
    if (!image || !image.phash) {
      res.json([]);
      return;
    }

    const allImages = await db.select({
      id: images.id,
      phash: images.phash,
      filePath: images.filePath,
      dayOfWeek: images.dayOfWeek,
      createdAt: images.createdAt,
    }).from(images).where(sql`${images.phash} IS NOT NULL AND ${images.id} != ${image.id}`);

    const similar = allImages
      .filter((img) => img.phash && areSimilar(image.phash!, img.phash))
      .map((img) => ({
        ...img,
        distance: hammingDistance(image.phash!, img.phash!),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    res.json(similar);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **步骤 3：Commit**

```bash
git add server/src/routes/images.ts
git commit -m "feat(server): detect similar images on upload"
```

---

### 任务 4：前端组件

**文件：**
- 修改：`client/src/lib/api.ts`
- 创建：`client/src/components/SimilarityWarning.tsx`
- 修改：`client/src/components/ImageUploader.tsx`

- [ ] **步骤 1：添加 API 函数**

```typescript
export interface SimilarImage {
  id: string;
  filePath: string;
  distance: number;
}

export async function findSimilar(imageId: string): Promise<SimilarImage[]> {
  const res = await fetch(`${BASE}/images/${imageId}/similar`);
  if (!res.ok) throw new Error('Failed to find similar');
  return res.json();
}
```

- [ ] **步骤 2：创建 SimilarityWarning 组件**

```tsx
// client/src/components/SimilarityWarning.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { imageUrl } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import type { SimilarImage } from '@/lib/api';

interface SimilarityWarningProps {
  similarImages: SimilarImage[];
  onDismiss: () => void;
}

export function SimilarityWarning({ similarImages, onDismiss }: SimilarityWarningProps) {
  const { locale } = useLanguage();

  if (similarImages.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] max-w-md w-full mx-4
          bg-[var(--card)] border border-amber-400/50 rounded-xl shadow-xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-400/15 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-heading font-semibold text-[var(--text)]">
              {locale === 'zh' ? '发现相似图片' : 'Similar images found'}
            </h4>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {locale === 'zh'
                ? '你可能已经收集过类似的灵感'
                : 'You may have already collected similar inspiration'}
            </p>
            <div className="flex gap-2 mt-2">
              {similarImages.slice(0, 3).map((img) => (
                <div
                  key={img.id}
                  className="w-14 h-14 rounded-md overflow-hidden border border-[var(--card-border)]"
                >
                  <img src={imageUrl(img.filePath)} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded-full hover:bg-[var(--muted)]"
          >
            <X className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **步骤 3：在 ImageUploader 中集成**

在 ImageUploader 的上传成功回调中，检查返回的 `similarImages` 字段：

```typescript
const handleUpload = async (file: File) => {
  // ... existing upload logic
  const result = await uploadImage(file, weekId, dayOfWeek);
  if (result.similarImages?.length > 0) {
    setSimilarImages(result.similarImages);
  }
  // ... rest
};
```

- [ ] **步骤 4：Commit**

```bash
git add client/src/lib/api.ts client/src/components/SimilarityWarning.tsx client/src/components/ImageUploader.tsx
git commit -m "feat(client): show similarity warning on image upload"
```
