# Tag/Category System Implementation Plan

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 添加用户自定义标签系统，支持为图片打标签（如 #UI #插画 #排版），并按标签筛选

**架构：** 新增 `tags` 和 `image_tags` 两张表，后端提供 CRUD API，前端在 ImageCard 和搜索中集成标签管理

**技术栈：** Drizzle ORM, Express, React, TypeScript

---

## 文件结构

- 修改：`server/src/db/schema.ts` — 添加 tags + image_tags 表
- 修改：`server/src/index.ts:21-55` — initDB 添加新表
- 创建：`server/src/routes/tags.ts` — 标签 CRUD API
- 修改：`server/src/index.ts:80-84` — 注册 tags 路由
- 修改：`server/src/routes/images.ts:65-71` — 图片查询时关联 tags
- 修改：`server/src/routes/search.ts` — 搜索支持标签
- 修改：`client/src/types/index.ts` — 添加 Tag 类型
- 修改：`client/src/lib/api.ts` — 添加标签 API 函数
- 创建：`client/src/components/TagManager.tsx` — 标签管理组件
- 修改：`client/src/components/ImageCard.tsx:238-284` — detail modal 中集成标签
- 修改：`client/src/components/SearchDialog.tsx` — 搜索支持标签筛选
- 修改：`client/src/i18n/translations.ts` — 添加标签相关文案

---

### 任务 1：数据库层 — 添加 tags 和 image_tags 表

**文件：**
- 修改：`server/src/db/schema.ts`
- 修改：`server/src/index.ts`

- [ ] **步骤 1：在 schema.ts 末尾添加新表定义**

```typescript
export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#c0784a'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const imageTags = pgTable('image_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  imageId: uuid('image_id').references(() => images.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});
```

- [ ] **步骤 2：在 initDB 的 SQL 中添加新表**

在 `server/src/index.ts` 的 `initDB` 函数中，`CREATE TABLE IF NOT EXISTS config` 之后添加：

```sql
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#c0784a',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS image_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(image_id, tag_id)
);
```

- [ ] **步骤 3：Commit**

```bash
git add server/src/db/schema.ts server/src/index.ts
git commit -m "feat(server): add tags and image_tags tables"
```

---

### 任务 2：标签 CRUD API

**文件：**
- 创建：`server/src/routes/tags.ts`
- 修改：`server/src/index.ts`

- [ ] **步骤 1：创建 tags 路由**

```typescript
// server/src/routes/tags.ts
import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { tags, imageTags } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = Router();

// GET /api/tags — list all tags
router.get('/', async (_req: Request, res: Response) => {
  try {
    const allTags = await db.select().from(tags).orderBy(tags.name);
    res.json(allTags);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tags — create a tag
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, color } = req.body;
    if (!name?.trim()) {
      res.status(400).json({ error: 'Tag name is required' });
      return;
    }
    const [tag] = await db.insert(tags).values({
      name: name.trim(),
      color: color || '#c0784a',
    }).returning();
    res.json(tag);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'Tag already exists' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tags/:id — delete a tag
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await db.delete(tags).where(eq(tags.id, req.params.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/images/:imageId/tags — add tag to image
router.post('/image/:imageId', async (req: Request, res: Response) => {
  try {
    const { tagId } = req.body;
    const { imageId } = req.params;
    if (!tagId) {
      res.status(400).json({ error: 'tagId is required' });
      return;
    }
    const [link] = await db.insert(imageTags).values({ imageId, tagId }).returning();
    res.json(link);
  } catch (err: any) {
    if (err.code === '23505') {
      res.json({ success: true, message: 'Already tagged' });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/images/:imageId/tags/:tagId — remove tag from image
router.delete('/image/:imageId/:tagId', async (req: Request, res: Response) => {
  try {
    await db.delete(imageTags).where(
      and(eq(imageTags.imageId, req.params.imageId), eq(imageTags.tagId, req.params.tagId))
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tags/:tagId/images — get all images with this tag
router.get('/:tagId/images', async (req: Request, res: Response) => {
  try {
    const links = await db.select().from(imageTags).where(eq(imageTags.tagId, req.params.tagId));
    res.json(links.map((l) => l.imageId));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **步骤 2：在 index.ts 注册路由**

在 `server/src/index.ts` 的 `app.use('/api/search', searchRouter)` 之后添加：

```typescript
import tagsRouter from './routes/tags.js';
// ...
app.use('/api/tags', tagsRouter);
```

- [ ] **步骤 3：Commit**

```bash
git add server/src/routes/tags.ts server/src/index.ts
git commit -m "feat(server): add tags CRUD API"
```

---

### 任务 3：图片查询关联 tags

**文件：**
- 修改：`server/src/routes/weeks.ts` — 周查询时返回 tags
- 修改：`server/src/routes/search.ts` — 搜索结果返回 tags

- [ ] **步骤 1：修改 weeks 路由查询**

在 `server/src/routes/weeks.ts` 中，查询 images 后需要查询关联的 tags。修改返回 images 的逻辑，为每个 image 查询其 tags：

```typescript
// 在查询 images 之后，批量查询 image_tags 和 tags
import { tags as tagsTable, imageTags } from '../db/schema.js';

// 查询该周所有 image 的 tags
const imageIds = weekImages.map(img => img.id);
const allImageTags = imageIds.length > 0
  ? await db
      .select({
        imageId: imageTags.imageId,
        tagId: tagsTable.id,
        tagName: tagsTable.name,
        tagColor: tagsTable.color,
      })
      .from(imageTags)
      .innerJoin(tagsTable, eq(imageTags.tagId, tagsTable.id))
      .where(sql`${imageTags.imageId} = ANY(${imageIds})`)
  : [];

// Group tags by imageId
const tagsByImage: Record<string, any[]> = {};
for (const at of allImageTags) {
  if (!tagsByImage[at.imageId]) tagsByImage[at.imageId] = [];
  tagsByImage[at.imageId].push({ id: at.tagId, name: at.tagName, color: at.tagColor });
}
```

然后在构造返回数据时，为每个 image 添加 `tags` 字段：

```typescript
const imagesWithTermsAndTags = weekImages.map((img) => ({
  ...img,
  terms: termsByImage[img.id] || [],
  tags: tagsByImage[img.id] || [],
}));
```

- [ ] **步骤 2：对 search.ts 做同样的修改**

在 `server/src/routes/search.ts` 中，同样为搜索结果的 images 关联 tags。

- [ ] **步骤 3：Commit**

```bash
git add server/src/routes/weeks.ts server/src/routes/search.ts
git commit -m "feat(server): include tags in image queries"
```

---

### 任务 4：前端类型和 API

**文件：**
- 修改：`client/src/types/index.ts`
- 修改：`client/src/lib/api.ts`

- [ ] **步骤 1：添加 Tag 类型**

在 `client/src/types/index.ts` 中添加：

```typescript
export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt?: string;
}
```

在 `Image` 接口中添加 `tags` 字段：

```typescript
export interface Image {
  id: string;
  weekId: string;
  dayOfWeek: number;
  filePath: string;
  decoration: DecorationType;
  createdAt: string;
  terms: Term[];
  tags: Tag[];  // 新增
}
```

- [ ] **步骤 2：在 api.ts 添加标签 API**

```typescript
import type { Tag } from '@/types';

export async function fetchTags(): Promise<Tag[]> {
  const res = await fetch(`${BASE}/tags`);
  if (!res.ok) throw new Error('Failed to fetch tags');
  return res.json();
}

export async function createTag(name: string, color?: string): Promise<Tag> {
  const res = await fetch(`${BASE}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  });
  if (!res.ok) throw new Error('Failed to create tag');
  return res.json();
}

export async function deleteTag(id: string): Promise<void> {
  const res = await fetch(`${BASE}/tags/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete tag');
}

export async function addTagToImage(imageId: string, tagId: string): Promise<void> {
  const res = await fetch(`${BASE}/tags/image/${imageId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tagId }),
  });
  if (!res.ok) throw new Error('Failed to add tag');
}

export async function removeTagFromImage(imageId: string, tagId: string): Promise<void> {
  const res = await fetch(`${BASE}/tags/image/${imageId}/${tagId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to remove tag');
}
```

- [ ] **步骤 3：Commit**

```bash
git add client/src/types/index.ts client/src/lib/api.ts
git commit -m "feat(client): add tag types and API functions"
```

---

### 任务 5：TagManager 组件

**文件：**
- 创建：`client/src/components/TagManager.tsx`

- [ ] **步骤 1：创建 TagManager 组件**

```tsx
// client/src/components/TagManager.tsx
import { useState, useEffect, useRef } from 'react';
import { Tag as TagIcon, Plus, X } from 'lucide-react';
import { fetchTags, createTag, addTagToImage, removeTagFromImage } from '@/lib/api';
import { toast } from '@/components/Toast';
import type { Tag } from '@/types';

interface TagManagerProps {
  imageId: string;
  imageTags: Tag[];
  onTagsChange: () => void;
}

export function TagManager({ imageId, imageTags, onTagsChange }: TagManagerProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTags().then(setAllTags).catch(console.error);
  }, []);

  useEffect(() => {
    if (showPicker) inputRef.current?.focus();
  }, [showPicker]);

  const imageTagIds = new Set(imageTags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !imageTagIds.has(t.id));

  const handleAdd = async (tagId: string) => {
    try {
      await addTagToImage(imageId, tagId);
      onTagsChange();
    } catch {
      toast('error', 'Failed to add tag');
    }
  };

  const handleRemove = async (tagId: string) => {
    try {
      await removeTagFromImage(imageId, tagId);
      onTagsChange();
    } catch {
      toast('error', 'Failed to remove tag');
    }
  };

  const handleCreateAndAdd = async () => {
    const name = newTagName.trim();
    if (!name) return;
    try {
      const tag = await createTag(name);
      setAllTags((prev) => [...prev, tag]);
      await addTagToImage(imageId, tag.id);
      setNewTagName('');
      onTagsChange();
    } catch {
      toast('error', 'Failed to create tag');
    }
  };

  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5 flex-wrap">
        {imageTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-heading"
            style={{ backgroundColor: tag.color + '20', color: tag.color, border: `1px solid ${tag.color}40` }}
          >
            #{tag.name}
            <button onClick={() => handleRemove(tag.id)} className="hover:opacity-60">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="p-1 rounded-full hover:bg-[var(--muted)] transition-colors"
        >
          <Plus className="w-4 h-4 text-[var(--text-muted)]" />
        </button>
      </div>

      {showPicker && (
        <div className="mt-2 p-2 rounded-lg bg-[var(--muted)] border border-[var(--card-border)]">
          <div className="flex gap-1 mb-2">
            <input
              ref={inputRef}
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateAndAdd()}
              placeholder="New tag..."
              className="flex-1 px-2 py-1 text-sm rounded bg-[var(--card)] border border-[var(--card-border)] text-[var(--text)] outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={handleCreateAndAdd}
              disabled={!newTagName.trim()}
              className="px-2 py-1 text-xs rounded bg-[var(--accent)] text-white disabled:opacity-40"
            >
              +
            </button>
          </div>
          {availableTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleAdd(tag.id)}
                  className="px-2 py-0.5 rounded-full text-xs font-heading hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: tag.color + '20', color: tag.color }}
                >
                  #{tag.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **步骤 2：Commit**

```bash
git add client/src/components/TagManager.tsx
git commit -m "feat(client): add TagManager component"
```

---

### 任务 6：在 ImageCard detail modal 中集成 TagManager

**文件：**
- 修改：`client/src/components/ImageCard.tsx:238-284`

- [ ] **步骤 1：在 detail modal 的 terms 区域之后添加 TagManager**

导入 TagManager：
```typescript
import { TagManager } from './TagManager';
```

在 detail modal 中，`{/* Terms */}` 区域的 `</div>` 之后、`</motion.div>` 之前添加：

```tsx
{/* Tags */}
<div className="px-6 pb-4">
  <TagManager
    imageId={image.id}
    imageTags={image.tags || []}
    onTagsChange={onRefresh}
  />
</div>
```

- [ ] **步骤 2：Commit**

```bash
git add client/src/components/ImageCard.tsx
git commit -m "feat(client): integrate TagManager in image detail modal"
```

---

### 任务 7：搜索支持标签筛选

**文件：**
- 修改：`client/src/components/SearchDialog.tsx`

- [ ] **步骤 1：添加标签筛选功能**

在 SearchDialog 中添加标签筛选按钮，点击标签时切换到按标签搜索模式。在搜索结果区域上方显示标签列表：

```tsx
import { fetchTags } from '@/lib/api';
import type { Tag } from '@/types';

// 在组件内部
const [allTags, setAllTags] = useState<Tag[]>([]);
const [selectedTag, setSelectedTag] = useState<string | null>(null);

useEffect(() => {
  if (open) fetchTags().then(setAllTags).catch(console.error);
}, [open]);
```

在搜索输入框下方添加标签筛选栏：

```tsx
{allTags.length > 0 && (
  <div className="flex flex-wrap gap-1.5 px-1">
    {allTags.map((tag) => (
      <button
        key={tag.id}
        onClick={() => setSelectedTag(selectedTag === tag.id ? null : tag.id)}
        className={`px-2 py-0.5 rounded-full text-xs font-heading transition-opacity ${
          selectedTag === tag.id ? 'ring-2 ring-[var(--accent)]' : 'opacity-70 hover:opacity-100'
        }`}
        style={{ backgroundColor: tag.color + '20', color: tag.color }}
      >
        #{tag.name}
      </button>
    ))}
  </div>
)}
```

- [ ] **步骤 2：Commit**

```bash
git add client/src/components/SearchDialog.tsx
git commit -m "feat(client): add tag filtering to search dialog"
```
