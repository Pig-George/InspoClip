import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { images as imagesTable, terms as termsTable, tags as tagsTable, imageTags, imageColors as imageColorsTable } from '../db/schema.js';
import { ilike, inArray, eq } from 'drizzle-orm';

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

    // Query tags for these images
    let allImageTags: any[] = [];
    if (imageIdList.length > 0) {
      allImageTags = await db
        .select({
          imageId: imageTags.imageId,
          tagId: tagsTable.id,
          tagName: tagsTable.name,
          tagColor: tagsTable.color,
        })
        .from(imageTags)
        .innerJoin(tagsTable, eq(imageTags.tagId, tagsTable.id))
        .where(inArray(imageTags.imageId, imageIdList));
    }

    const tagsByImage: Record<string, any[]> = {};
    for (const at of allImageTags) {
      if (!tagsByImage[at.imageId]) tagsByImage[at.imageId] = [];
      tagsByImage[at.imageId].push({ id: at.tagId, name: at.tagName, color: at.tagColor });
    }

    // Query colors for these images
    let allColors: any[] = [];
    if (imageIdList.length > 0) {
      allColors = await db
        .select()
        .from(imageColorsTable)
        .where(inArray(imageColorsTable.imageId, imageIdList))
        .orderBy(imageColorsTable.position);
    }

    const colorsByImage: Record<string, string[]> = {};
    for (const c of allColors) {
      if (!colorsByImage[c.imageId]) colorsByImage[c.imageId] = [];
      colorsByImage[c.imageId].push(c.hex);
    }

    res.json(matchingImages.map((img) => ({
      ...img,
      terms: termsByImage[img.id] || [],
      tags: tagsByImage[img.id] || [],
      colors: colorsByImage[img.id] || [],
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

export default router;
