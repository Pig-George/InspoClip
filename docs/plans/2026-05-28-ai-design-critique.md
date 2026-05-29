# AI Design Critique Implementation Plan

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 增加可选的「AI 点评」功能，让 AI 用一两句话点评设计亮点（排版、配色、留白等）

**架构：** 扩展 AI 服务添加 critique 生成函数，新增 `image_critiques` 表存储点评，前端在 detail modal 中显示点评区域

**技术栈：** OpenAI SDK (已有), Drizzle ORM, React

---

## 文件结构

- 修改：`server/src/services/ai.ts` — 添加 generateCritique 函数
- 修改：`server/src/db/schema.ts` — 添加 image_critiques 表
- 修改：`server/src/index.ts` — initDB 添加新表
- 修改：`server/src/routes/images.ts` — 添加 critique API 端点
- 修改：`client/src/types/index.ts` — 添加 Critique 类型
- 修改：`client/src/lib/api.ts` — 添加 critique API 函数
- 创建：`client/src/components/DesignCritique.tsx` — 点评组件
- 修改：`client/src/components/ImageCard.tsx` — 集成点评
- 修改：`client/src/i18n/translations.ts` — 添加点评文案

---

### 任务 1：AI 点评生成服务

**文件：**
- 修改：`server/src/services/ai.ts`

- [ ] **步骤 1：添加 generateCritique 函数**

在 `server/src/services/ai.ts` 末尾添加：

```typescript
const CRITIQUE_PROMPT = `Analyze this UI/UX design screenshot and provide a brief, insightful critique (2-3 sentences) in BOTH English and Chinese. Focus on what works well — mention specific aspects like typography, color harmony, spacing, visual hierarchy, or overall composition. Be encouraging but specific. Format your response as JSON:
{"en": "Your English critique here", "zh": "Your Chinese critique here"}`;

export async function generateCritique(imagePath: string): Promise<{ en: string; zh: string }> {
  const cfg = await getConfig();

  const fs = await import('fs/promises');
  const imageBuffer = await fs.readFile(imagePath);

  let processedBuffer: Buffer = imageBuffer;
  let mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const maxDim = 1024;
    if ((metadata.width && metadata.width > maxDim) || (metadata.height && metadata.height > maxDim)) {
      processedBuffer = await sharp(imageBuffer)
        .resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer() as Buffer;
      mimeType = 'image/jpeg';
    }
  } catch { /* use original */ }

  const base64 = processedBuffer.toString('base64');

  let rawText = '';

  if (cfg.provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: CRITIQUE_PROMPT }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
        generationConfig: { maxOutputTokens: 300, temperature: 0.7 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}`);
    const json: any = await res.json();
    rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
  } else if (cfg.provider === 'anthropic') {
    const base = cfg.baseURL || 'https://api.anthropic.com/v1';
    const res = await fetch(`${base}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: 300,
        messages: [{ role: 'user', content: [
          { type: 'text', text: CRITIQUE_PROMPT },
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
        ] }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error ${res.status}`);
    const json: any = await res.json();
    rawText = json?.content?.[0]?.text?.trim() || '{}';
  } else {
    const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
    const stream = await client.chat.completions.create({
      model: cfg.model,
      messages: [{ role: 'user', content: [
        { type: 'text', text: CRITIQUE_PROMPT },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
      ] }],
      max_tokens: 300,
      temperature: 0.7,
      stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) rawText += delta;
    }
  }

  try {
    const parsed = JSON.parse(rawText.trim());
    return { en: parsed.en || '', zh: parsed.zh || '' };
  } catch {
    return { en: rawText.trim(), zh: rawText.trim() };
  }
}
```

- [ ] **步骤 2：Commit**

```bash
git add server/src/services/ai.ts
git commit -m "feat(server): add AI design critique generation"
```

---

### 任务 2：数据库和 API

**文件：**
- 修改：`server/src/db/schema.ts`
- 修改：`server/src/index.ts`
- 修改：`server/src/routes/images.ts`

- [ ] **步骤 1：添加 image_critiques 表**

在 `server/src/db/schema.ts` 末尾：

```typescript
export const imageCritiques = pgTable('image_critiques', {
  id: uuid('id').defaultRandom().primaryKey(),
  imageId: uuid('image_id').references(() => images.id, { onDelete: 'cascade' }).unique(),
  contentEn: text('content_en').notNull(),
  contentZh: text('content_zh').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

在 initDB 中添加：
```sql
CREATE TABLE IF NOT EXISTS image_critiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES images(id) ON DELETE CASCADE UNIQUE,
  content_en TEXT NOT NULL,
  content_zh TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] **步骤 2：添加 critique API 端点**

在 `server/src/routes/images.ts` 中添加：

```typescript
import { generateCritique } from '../services/ai.js';
import { imageCritiques } from '../db/schema.js';

// POST /api/images/:id/critique — generate or get critique
router.post('/:id/critique', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    // Check if critique already exists
    const existing = await db.select().from(imageCritiques).where(eq(imageCritiques.imageId, id)).limit(1);
    if (existing.length > 0) {
      res.json(existing[0]);
      return;
    }

    // Get image
    const [image] = await db.select().from(images).where(eq(images.id, id)).limit(1);
    if (!image) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = `${uploadDir}/${image.filePath}`;

    const critique = await generateCritique(filePath);

    const [saved] = await db.insert(imageCritiques).values({
      imageId: id,
      contentEn: critique.en,
      contentZh: critique.zh,
    }).returning();

    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **步骤 3：Commit**

```bash
git add server/src/db/schema.ts server/src/index.ts server/src/routes/images.ts
git commit -m "feat(server): add design critique API and storage"
```

---

### 任务 3：前端集成

**文件：**
- 修改：`client/src/lib/api.ts`
- 创建：`client/src/components/DesignCritique.tsx`
- 修改：`client/src/components/ImageCard.tsx`

- [ ] **步骤 1：添加 API 函数**

```typescript
export interface Critique {
  id: string;
  imageId: string;
  contentEn: string;
  contentZh: string;
}

export async function generateCritique(imageId: string): Promise<Critique> {
  const res = await fetch(`${BASE}/images/${imageId}/critique`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to generate critique');
  return res.json();
}
```

- [ ] **步骤 2：创建 DesignCritique 组件**

```tsx
// client/src/components/DesignCritique.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateCritique } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import { toast } from '@/components/Toast';
import type { Critique } from '@/lib/api';

interface DesignCritiqueProps {
  imageId: string;
}

export function DesignCritique({ imageId }: DesignCritiqueProps) {
  const [critique, setCritique] = useState<Critique | null>(null);
  const [loading, setLoading] = useState(false);
  const { locale } = useLanguage();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateCritique(imageId);
      setCritique(result);
    } catch {
      toast('error', locale === 'zh' ? '生成点评失败' : 'Failed to generate critique');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3">
      {!critique && !loading && (
        <button
          onClick={handleGenerate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-heading
            bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {locale === 'zh' ? 'AI 点评' : 'AI Critique'}
        </button>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          {locale === 'zh' ? '正在分析...' : 'Analyzing...'}
        </div>
      )}

      <AnimatePresence>
        {critique && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/20"
          >
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent)] mt-0.5 flex-shrink-0" />
              <p className="text-sm text-[var(--text)] leading-relaxed font-handwriting">
                {locale === 'zh' ? critique.contentZh : critique.contentEn}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **步骤 3：在 ImageCard detail modal 集成**

在 detail modal 的 Colors 区域之后添加：

```tsx
{/* AI Critique */}
<div className="px-6 pb-4">
  <DesignCritique imageId={image.id} />
</div>
```

- [ ] **步骤 4：Commit**

```bash
git add client/src/lib/api.ts client/src/components/DesignCritique.tsx client/src/components/ImageCard.tsx
git commit -m "feat(client): add AI design critique to image detail modal"
```
