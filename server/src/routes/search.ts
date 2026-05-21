import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { images as imagesTable, terms as termsTable } from '../db/schema.js';
import { ilike, inArray, sql } from 'drizzle-orm';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) { res.json([]); return; }

    const matchingTerms = await db
      .select()
      .from(termsTable)
      .where(ilike(termsTable.keyword, `%${q}%`))
      .limit(50);

    if (matchingTerms.length === 0) { res.json([]); return; }

    const imageIds = [...new Set(matchingTerms.map((t) => t.imageId).filter(Boolean))] as string[];

    let matchingImages: any[] = [];
    if (imageIds.length > 0) {
      matchingImages = await db
        .select()
        .from(imagesTable)
        .where(inArray(imagesTable.id, imageIds))
        .limit(30);
    }

    const imageIdList = matchingImages.map((img) => img.id);
    let allTerms: any[] = [];
    if (imageIdList.length > 0) {
      allTerms = await db
        .select()
        .from(termsTable)
        .where(inArray(termsTable.imageId, imageIdList))
        .orderBy(termsTable.position);
    }

    const termsByImage: Record<string, any[]> = {};
    for (const t of allTerms) {
      const imgId = t.imageId as string;
      if (!imgId) continue;
      if (!termsByImage[imgId]) termsByImage[imgId] = [];
      termsByImage[imgId].push(t);
    }

    res.json(matchingImages.map((img) => ({
      ...img,
      terms: termsByImage[img.id] || [],
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

export default router;
