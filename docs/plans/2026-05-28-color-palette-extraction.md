# Color Palette Extraction Implementation Plan

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 上传图片后自动提取 5-6 个主色并显示色卡（HEX），设计师可直接复制色值

**架构：** 后端使用 sharp 的 stats 功能提取 dominant colors，存储到新表 `image_colors`，前端在 ImageCard 和 detail modal 中展示色卡

**技术栈：** sharp (已在项目中), Drizzle ORM, React

---

## 文件结构

- 创建：`server/src/services/colors.ts` — 颜色提取服务
- 修改：`server/src/db/schema.ts` — 添加 image_colors 表
- 修改：`server/src/index.ts:21-55` — initDB 添加新表
- 修改：`server/src/routes/images.ts:39-63` — 上传时提取颜色
- 修改：`server/src/routes/weeks.ts` — 查询时返回 colors
- 修改：`client/src/types/index.ts` — 添加 Color 类型
- 创建：`client/src/components/ColorPalette.tsx` — 色卡组件
- 修改：`client/src/components/ImageCard.tsx` — 集成色卡
- 修改：`client/src/i18n/translations.ts` — 添加色卡文案

---

### 任务 1：颜色提取服务

**文件：**
- 创建：`server/src/services/colors.ts`

- [ ] **步骤 1：实现颜色提取逻辑**

```typescript
// server/src/services/colors.ts
import sharp from 'sharp';

export interface ExtractedColor {
  hex: string;
  r: number;
  g: number;
  b: number;
  population: number;
}

/**
 * Extract dominant colors from an image using sharp's stats.
 * Returns top N colors sorted by population (descending).
 */
export async function extractColors(imagePath: string, count: number = 6): Promise<ExtractedColor[]> {
  try {
    // Resize to small dimensions for fast color analysis
    const buffer = await sharp(imagePath)
      .resize(100, 100, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = buffer;
    const pixelCount = info.width * info.height;

    // Simple k-means-like color quantization
    // Sample pixels and cluster by color similarity
    const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>();

    // Quantize to reduce color space (group similar colors)
    const quantize = (v: number) => Math.round(v / 32) * 32;

    for (let i = 0; i < data.length; i += 3) {
      const r = quantize(data[i]);
      const g = quantize(data[i + 1]);
      const b = quantize(data[i + 2]);
      const key = `${r},${g},${b}`;

      const existing = colorMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        colorMap.set(key, { r, g, b, count: 1 });
      }
    }

    // Sort by population and take top N
    const sorted = Array.from(colorMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, count);

    // Filter out near-black and near-white (not useful as design colors)
    const filtered = sorted.filter((c) => {
      const brightness = (c.r + c.g + c.b) / 3;
      return brightness > 20 && brightness < 240;
    });

    return filtered.slice(0, count).map((c) => ({
      hex: `#${[c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`,
      r: c.r,
      g: c.g,
      b: c.b,
      population: c.count,
    }));
  } catch (err: any) {
    console.error('[Colors] Extraction failed:', err.message);
    return [];
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add server/src/services/colors.ts
git commit -m "feat(server): add color palette extraction service using sharp"
```

---

### 任务 2：数据库层 — image_colors 表

**文件：**
- 修改：`server/src/db/schema.ts`
- 修改：`server/src/index.ts`

- [ ] **步骤 1：添加 image_colors 表定义**

在 `server/src/db/schema.ts` 末尾添加：

```typescript
export const imageColors = pgTable('image_colors', {
  id: uuid('id').defaultRandom().primaryKey(),
  imageId: uuid('image_id').references(() => images.id, { onDelete: 'cascade' }),
  hex: text('hex').notNull(),
  position: smallint('position').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

- [ ] **步骤 2：在 initDB 中添加表创建 SQL**

```sql
CREATE TABLE IF NOT EXISTS image_colors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  hex TEXT NOT NULL,
  position SMALLINT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] **步骤 3：Commit**

```bash
git add server/src/db/schema.ts server/src/index.ts
git commit -m "feat(server): add image_colors table"
```

---

### 任务 3：上传时提取颜色

**文件：**
- 修改：`server/src/routes/images.ts:39-63`

- [ ] **步骤 1：在图片上传后提取颜色并存储**

在 `server/src/routes/images.ts` 中，导入颜色相关模块：

```typescript
import { extractColors } from '../services/colors.js';
import { imageColors } from '../db/schema.js';
```

在 AI 术语生成的 try/catch 块之后，添加颜色提取：

```typescript
// Extract colors (non-blocking, best effort)
extractColors(file.path)
  .then(async (colors) => {
    if (colors.length > 0) {
      await db.insert(imageColors).values(
        colors.map((c, i) => ({ imageId: image.id, hex: c.hex, position: i }))
      );
    }
  })
  .catch((err) => console.error('Color extraction failed:', err.message));
```

- [ ] **步骤 2：Commit**

```bash
git add server/src/routes/images.ts
git commit -m "feat(server): extract colors on image upload"
```

---

### 任务 4：查询时返回颜色数据

**文件：**
- 修改：`server/src/routes/weeks.ts`
- 修改：`server/src/routes/search.ts`

- [ ] **步骤 1：在 weeks 路由中查询 colors**

在查询 images 后，批量查询 image_colors：

```typescript
import { imageColors as imageColorsTable } from '../db/schema.js';

const allColors = imageIds.length > 0
  ? await db.select().from(imageColorsTable).orderBy(imageColorsTable.position)
  : [];

const colorsByImage: Record<string, string[]> = {};
for (const c of allColors) {
  if (!colorsByImage[c.imageId]) colorsByImage[c.imageId] = [];
  colorsByImage[c.imageId].push(c.hex);
}
```

在构造返回数据时添加 `colors` 字段：

```typescript
const imagesWithEverything = weekImages.map((img) => ({
  ...img,
  terms: termsByImage[img.id] || [],
  colors: colorsByImage[img.id] || [],
}));
```

- [ ] **步骤 2：对 search.ts 做同样修改**

- [ ] **步骤 3：Commit**

```bash
git add server/src/routes/weeks.ts server/src/routes/search.ts
git commit -m "feat(server): include colors in image query results"
```

---

### 任务 5：前端类型和组件

**文件：**
- 修改：`client/src/types/index.ts`
- 创建：`client/src/components/ColorPalette.tsx`
- 修改：`client/src/components/ImageCard.tsx`

- [ ] **步骤 1：更新 Image 类型**

在 `client/src/types/index.ts` 的 `Image` 接口中添加：

```typescript
export interface Image {
  // ... existing fields
  colors: string[];  // 新增: hex color strings
}
```

- [ ] **步骤 2：创建 ColorPalette 组件**

```tsx
// client/src/components/ColorPalette.tsx
import { useState } from 'react';
import { Check } from 'lucide-react';
import { toast } from '@/components/Toast';

interface ColorPaletteProps {
  colors: string[];
  compact?: boolean;
}

export function ColorPalette({ colors, compact = false }: ColorPaletteProps) {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  if (colors.length === 0) return null;

  const handleCopy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex.toUpperCase());
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 1500);
    } catch {
      toast('error', 'Failed to copy');
    }
  };

  if (compact) {
    // Compact mode: small dots for card view
    return (
      <div className="flex items-center gap-0.5 mt-1">
        {colors.map((hex) => (
          <button
            key={hex}
            onClick={(e) => { e.stopPropagation(); handleCopy(hex); }}
            className="w-3 h-3 rounded-full border border-[var(--card-border)] hover:scale-150 transition-transform cursor-pointer"
            style={{ backgroundColor: hex }}
            title={hex.toUpperCase()}
          />
        ))}
      </div>
    );
  }

  // Full mode: color cards for detail modal
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((hex) => (
        <button
          key={hex}
          onClick={() => handleCopy(hex)}
          className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--card-border)] hover:border-[var(--accent)] transition-colors"
        >
          <div
            className="w-6 h-6 rounded-md border border-[var(--card-border)]"
            style={{ backgroundColor: hex }}
          />
          <span className="text-xs font-mono text-[var(--text-muted)] group-hover:text-[var(--text)]">
            {copiedHex === hex ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              hex.toUpperCase()
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **步骤 3：在 ImageCard 中集成色卡**

导入：
```typescript
import { ColorPalette } from './ColorPalette';
```

在卡片的 terms 区域之后添加紧凑色卡（在 `</motion.div>` 之前）：

```tsx
{/* Color dots */}
{image.colors && image.colors.length > 0 && (
  <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
    <ColorPalette colors={image.colors} compact />
  </div>
)}
```

在 detail modal 的 terms 区域之后添加完整色卡：

```tsx
{/* Colors */}
{image.colors && image.colors.length > 0 && (
  <div className="px-6 pb-4">
    <h3 className="text-sm font-heading text-[var(--text-muted)] mb-2">
      {locale === 'zh' ? '配色方案' : 'Color Palette'}
    </h3>
    <ColorPalette colors={image.colors} />
  </div>
)}
```

- [ ] **步骤 4：Commit**

```bash
git add client/src/types/index.ts client/src/components/ColorPalette.tsx client/src/components/ImageCard.tsx
git commit -m "feat(client): add color palette display to image cards"
```
