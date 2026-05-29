# Drag-and-Drop Sorting Implementation Plan

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 支持拖拽调整同一天内图片的排序，方便按优先级排列灵感

**架构：** 使用 @dnd-kit 库实现拖拽排序，在 images 表添加 sort_order 字段，前端使用 SortableContext

**技术栈：** @dnd-kit/core + @dnd-kit/sortable, React, Express

---

## 文件结构

- 修改：`client/package.json` — 添加 @dnd-kit 依赖
- 修改：`server/src/db/schema.ts` — images 表添加 sortOrder
- 修改：`server/src/index.ts` — initDB
- 修改：`server/src/routes/images.ts` — 添加排序更新 API
- 修改：`client/src/types/index.ts` — Image 添加 sortOrder
- 修改：`client/src/lib/api.ts` — 添加排序 API
- 修改：`client/src/components/DayColumn.tsx` — 使用 DnD sortable
- 修改：`client/src/components/ImageCard.tsx` — 添加拖拽手柄

---

### 任务 1：安装 @dnd-kit

**文件：**
- 修改：`client/package.json`

- [ ] **步骤 1：安装依赖**

```bash
cd client && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **步骤 2：Commit**

```bash
git add client/package.json client/package-lock.json
git commit -m "feat(client): add @dnd-kit dependencies"
```

---

### 任务 2：数据库 — 添加 sortOrder

**文件：**
- 修改：`server/src/db/schema.ts`
- 修改：`server/src/index.ts`
- 修改：`server/src/routes/images.ts`

- [ ] **步骤 1：添加 sortOrder 字段**

在 `server/src/db/schema.ts` 的 images 表中添加：
```typescript
sortOrder: smallint('sort_order').notNull().default(0),
```

在 initDB SQL 中修改 images 表：
```sql
sort_order SMALLINT NOT NULL DEFAULT 0,
```

- [ ] **步骤 2：添加排序更新 API**

在 `server/src/routes/images.ts` 中添加：

```typescript
// PATCH /api/images/reorder — update sort order
router.patch('/reorder', async (req: Request, res: Response) => {
  try {
    const { orders } = req.body; // Array of { id: string, sortOrder: number }
    if (!Array.isArray(orders)) {
      res.status(400).json({ error: 'orders array is required' });
      return;
    }

    for (const { id, sortOrder } of orders) {
      await db.update(images).set({ sortOrder }).where(eq(images.id, id));
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **步骤 3：修改查询排序**

在 weeks 路由中，查询 images 时按 `sortOrder` 排序：
```typescript
.orderBy(images.sortOrder, images.createdAt)
```

- [ ] **步骤 4：Commit**

```bash
git add server/src/db/schema.ts server/src/index.ts server/src/routes/images.ts
git commit -m "feat(server): add sortOrder to images and reorder API"
```

---

### 任务 3：前端 API 和类型

**文件：**
- 修改：`client/src/types/index.ts`
- 修改：`client/src/lib/api.ts`

- [ ] **步骤 1：更新 Image 类型**

```typescript
export interface Image {
  // ... existing fields
  sortOrder: number;  // 新增
}
```

- [ ] **步骤 2：添加排序 API**

```typescript
export async function reorderImages(orders: { id: string; sortOrder: number }[]): Promise<void> {
  const res = await fetch(`${BASE}/images/reorder`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orders }),
  });
  if (!res.ok) throw new Error('Failed to reorder');
}
```

- [ ] **步骤 3：Commit**

```bash
git add client/src/types/index.ts client/src/lib/api.ts
git commit -m "feat(client): add reorder API and sortOrder type"
```

---

### 任务 4：DayColumn 集成 DnD

**文件：**
- 修改：`client/src/components/DayColumn.tsx`
- 修改：`client/src/components/ImageCard.tsx`

- [ ] **步骤 1：创建 SortableImageCard 包装组件**

在 DayColumn.tsx 中或新建一个文件：

```tsx
// client/src/components/SortableImageCard.tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ImageCard } from './ImageCard';
import type { Image as ImageType } from '@/types';

interface SortableImageCardProps {
  image: ImageType;
  onRefresh: () => void;
  animDelay?: number;
}

export function SortableImageCard({ image, onRefresh, animDelay }: SortableImageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ImageCard image={image} onRefresh={onRefresh} animDelay={animDelay} />
    </div>
  );
}
```

- [ ] **步骤 2：在 DayColumn 中使用 DnD context**

修改 DayColumn.tsx，将 images 列表包裹在 DnD context 中：

```tsx
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableImageCard } from './SortableImageCard';
import { reorderImages } from '@/lib/api';

// 在 DayColumn 组件内部
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);

const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const oldIndex = images.findIndex((img) => img.id === active.id);
  const newIndex = images.findIndex((img) => img.id === over.id);

  // Optimistic update
  const newImages = [...images];
  const [moved] = newImages.splice(oldIndex, 1);
  newImages.splice(newIndex, 0, moved);

  // Send reorder to server
  const orders = newImages.map((img, i) => ({ id: img.id, sortOrder: i }));
  try {
    await reorderImages(orders);
    onRefresh();
  } catch (err) {
    console.error('Reorder failed:', err);
    onRefresh(); // Revert
  }
};

// 替换原有的 images.map 为：
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={images.map((img) => img.id)} strategy={verticalListSortingStrategy}>
    {images.map((image) => (
      <SortableImageCard
        key={image.id}
        image={image}
        onRefresh={onRefresh}
        animDelay={animDelay}
      />
    ))}
  </SortableContext>
</DndContext>
```

- [ ] **步骤 3：Commit**

```bash
git add client/src/components/DayColumn.tsx client/src/components/SortableImageCard.tsx
git commit -m "feat(client): implement drag-and-drop image reordering"
```
