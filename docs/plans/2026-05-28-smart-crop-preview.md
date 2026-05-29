# Smart Image Crop Preview Implementation Plan

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 上传时自动识别设计主体区域，生成方形缩略图，避免重要设计被裁掉

**架构：** 后端使用 sharp 的 entropy/crop 策略智能裁剪，生成缩略图存储，前端优先使用缩略图

**技术栈：** sharp (已有), React

---

## 文件结构

- 创建：`server/src/services/thumbnail.ts` — 智能裁剪服务
- 修改：`server/src/routes/images.ts` — 上传时生成缩略图
- 修改：`server/src/routes/weeks.ts` — 查询时返回 thumbnailPath
- 修改：`client/src/lib/api.ts` — 添加 thumbnailUrl
- 修改：`client/src/components/ImageCard.tsx` — 使用缩略图

---

### 任务 1：智能裁剪服务

**文件：**
- 创建：`server/src/services/thumbnail.ts`

- [ ] **步骤 1：实现智能裁剪**

```typescript
// server/src/services/thumbnail.ts
import sharp from 'sharp';
import path from 'path';

/**
 * Generate a smart-cropped thumbnail for an image.
 * Uses entropy-based cropping to focus on the most "interesting" region.
 *
 * @param imagePath - Path to the original image
 * @param outputDir - Directory to save the thumbnail
 * @param size - Thumbnail size (default 300x300)
 * @returns The thumbnail filename
 */
export async function generateThumbnail(
  imagePath: string,
  outputDir: string,
  size: number = 300
): Promise<string> {
  const filename = path.basename(imagePath, path.extname(imagePath)) + '_thumb.jpg';
  const outputPath = path.join(outputDir, filename);

  try {
    const metadata = await sharp(imagePath).metadata();
    const width = metadata.width || 1;
    const height = metadata.height || 1;

    // Strategy: Use entropy-based smart crop for non-square images
    if (Math.abs(width - height) / Math.max(width, height) > 0.2) {
      // Significantly non-square: use entropy crop
      await sharp(imagePath)
        .resize(size, size, {
          fit: 'cover',
          position: sharp.strategy.entropy,
        })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
    } else {
      // Already roughly square: just resize
      await sharp(imagePath)
        .resize(size, size, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(outputPath);
    }

    return filename;
  } catch (err: any) {
    console.error('[Thumbnail] Failed:', err.message);
    // Fallback: simple resize
    await sharp(imagePath)
      .resize(size, size, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(outputPath);
    return filename;
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add server/src/services/thumbnail.ts
git commit -m "feat(server): add smart thumbnail generation with entropy crop"
```

---

### 任务 2：上传时生成缩略图

**文件：**
- 修改：`server/src/db/schema.ts` — images 表添加 thumbnailPath
- 修改：`server/src/index.ts` — initDB
- 修改：`server/src/routes/images.ts`

- [ ] **步骤 1：添加 thumbnailPath 字段**

在 `server/src/db/schema.ts` 的 images 表中添加：
```typescript
thumbnailPath: text('thumbnail_path'),
```

在 initDB SQL 的 images 表中添加：
```sql
thumbnail_path TEXT,
```

- [ ] **步骤 2：在上传处理中生成缩略图**

在 `server/src/routes/images.ts` 中导入：
```typescript
import { generateThumbnail } from '../services/thumbnail.js';
```

在颜色提取之后添加：
```typescript
// Generate smart thumbnail
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const thumbPath = await generateThumbnail(file.path, uploadDir);
await db.update(images).set({ thumbnailPath: thumbPath }).where(eq(images.id, image.id));
```

- [ ] **步骤 3：查询时返回 thumbnailPath**

在 weeks 和 search 路由的查询中，`thumbnailPath` 会自动包含在 image 对象中（因为是 SELECT *）。

- [ ] **步骤 4：Commit**

```bash
git add server/src/db/schema.ts server/src/index.ts server/src/routes/images.ts
git commit -m "feat(server): generate smart thumbnails on upload"
```

---

### 任务 3：前端使用缩略图

**文件：**
- 修改：`client/src/types/index.ts`
- 修改：`client/src/lib/api.ts`
- 修改：`client/src/components/ImageCard.tsx`

- [ ] **步骤 1：更新 Image 类型**

```typescript
export interface Image {
  // ... existing fields
  thumbnailPath: string | null;  // 新增
}
```

- [ ] **步骤 2：添加 thumbnailUrl 函数**

```typescript
export function thumbnailUrl(filePath: string): string {
  // thumbnailPath is like "uuid_thumb.jpg"
  return `${BASE}/uploads/${filePath}`;
}
```

- [ ] **步骤 3：在 ImageCard 中使用缩略图**

在卡片的 `<img>` 标签中，优先使用缩略图：

```tsx
<img
  src={image.thumbnailPath ? thumbnailUrl(image.thumbnailPath) : imageUrl(image.filePath)}
  alt="Design screenshot"
  className="w-full h-full object-cover"
  loading="lazy"
/>
```

detail modal 中继续使用原图 `imageUrl(image.filePath)`。

- [ ] **步骤 4：Commit**

```bash
git add client/src/types/index.ts client/src/lib/api.ts client/src/components/ImageCard.tsx
git commit -m "feat(client): use smart thumbnails in image cards"
```
