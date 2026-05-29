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
    const id = req.params.id as string;
    await db.delete(tags).where(eq(tags.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tags/image/:imageId — add tag to image
router.post('/image/:imageId', async (req: Request, res: Response) => {
  try {
    const { tagId } = req.body;
    const imageId = req.params.imageId as string;
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

// DELETE /api/tags/image/:imageId/:tagId — remove tag from image
router.delete('/image/:imageId/:tagId', async (req: Request, res: Response) => {
  try {
    const imageId = req.params.imageId as string;
    const tagId = req.params.tagId as string;
    await db.delete(imageTags).where(
      and(eq(imageTags.imageId, imageId), eq(imageTags.tagId, tagId))
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tags/:tagId/images — get all images with this tag
router.get('/:tagId/images', async (req: Request, res: Response) => {
  try {
    const tagId = req.params.tagId as string;
    const links = await db.select().from(imageTags).where(eq(imageTags.tagId, tagId));
    res.json(links.map((l) => l.imageId));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
