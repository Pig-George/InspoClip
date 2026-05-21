import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { terms as termsTable } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.delete(termsTable).where(eq(termsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
