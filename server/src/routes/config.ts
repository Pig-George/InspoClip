import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { config as configTable } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { maskApiKey } from '../ai/config.js';

const router = Router();

// GET /api/config — return current config (mask API key)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(configTable);
    const result: Record<string, string> = {};
    for (const row of rows) {
      if (row.key === 'AI_API_KEY' || row.key === 'VIDEO_AI_API_KEY') {
        result[row.key] = maskApiKey(row.value || '');
      } else {
        result[row.key] = row.value;
      }
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/config — update config keys
router.patch('/', async (req: Request, res: Response) => {
  try {
    const updates = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(updates)) {
      if (!['AI_PROVIDER', 'AI_API_KEY', 'AI_API_BASE', 'AI_MODEL', 'VIDEO_AI_PROVIDER', 'VIDEO_AI_API_KEY', 'VIDEO_AI_API_BASE', 'VIDEO_AI_MODEL', 'VIDEO_AI_FPS'].includes(key)) continue;
      if (typeof value !== 'string') continue;
      const [existing] = await db.select().from(configTable).where(eq(configTable.key, key)).limit(1);
      if (existing) {
        await db.update(configTable).set({ value }).where(eq(configTable.key, key));
      } else {
        await db.insert(configTable).values({ key, value });
      }
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
