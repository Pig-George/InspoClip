import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { weeks, images, terms as termsTable, notes, tags as tagsTable, imageTags, imageColors as imageColorsTable } from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';

const router = Router();

// GET /api/weeks/:date — fetch week data by any date within the week
router.get('/:date', async (req: Request, res: Response) => {
  try {
    const dateStr = req.params.date as string;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      res.status(400).json({ error: 'Invalid date' });
      return;
    }

    const dayOfWeek = date.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(date);
    monday.setDate(date.getDate() - daysFromMonday);
    const mondayStr = monday.toISOString().split('T')[0];

    let week = await db.select().from(weeks).where(eq(weeks.weekStart, mondayStr)).limit(1);
    if (week.length === 0) {
      const [newWeek] = await db.insert(weeks).values({ weekStart: mondayStr }).returning();
      week = [newWeek];
    }

    const weekId = week[0].id;

    const weekImages = await db
      .select()
      .from(images)
      .where(eq(images.weekId, weekId))
      .orderBy(images.createdAt);

    const imageIds = weekImages.map((img) => img.id);
    let allTerms: any[] = [];
    if (imageIds.length > 0) {
      allTerms = await db
        .select()
        .from(termsTable)
        .where(inArray(termsTable.imageId, imageIds))
        .orderBy(termsTable.position);
    }

    const termsByImage: Record<string, any[]> = {};
    for (const t of allTerms) {
      if (!termsByImage[t.imageId]) termsByImage[t.imageId] = [];
      termsByImage[t.imageId].push(t);
    }

    // Query tags for these images
    let allImageTags: any[] = [];
    if (imageIds.length > 0) {
      allImageTags = await db
        .select({
          imageId: imageTags.imageId,
          tagId: tagsTable.id,
          tagName: tagsTable.name,
          tagColor: tagsTable.color,
        })
        .from(imageTags)
        .innerJoin(tagsTable, eq(imageTags.tagId, tagsTable.id))
        .where(inArray(imageTags.imageId, imageIds));
    }

    const tagsByImage: Record<string, any[]> = {};
    for (const at of allImageTags) {
      if (!tagsByImage[at.imageId]) tagsByImage[at.imageId] = [];
      tagsByImage[at.imageId].push({ id: at.tagId, name: at.tagName, color: at.tagColor });
    }

    // Query colors for these images
    let allColors: any[] = [];
    if (imageIds.length > 0) {
      allColors = await db
        .select()
        .from(imageColorsTable)
        .where(inArray(imageColorsTable.imageId, imageIds))
        .orderBy(imageColorsTable.position);
    }

    const colorsByImage: Record<string, string[]> = {};
    for (const c of allColors) {
      if (!colorsByImage[c.imageId]) colorsByImage[c.imageId] = [];
      colorsByImage[c.imageId].push(c.hex);
    }

    const weekNotes = await db.select().from(notes).where(eq(notes.weekId, weekId)).limit(1);

    res.json({
      week: week[0],
      images: weekImages.map((img) => ({
        ...img,
        terms: termsByImage[img.id] || [],
        tags: tagsByImage[img.id] || [],
        colors: colorsByImage[img.id] || [],
      })),
      notes: weekNotes[0] || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// PATCH /api/weeks/:weekId/notes
router.patch('/:weekId/notes', async (req: Request, res: Response) => {
  try {
    const weekId = req.params.weekId as string;
    const { content } = req.body;

    const [existing] = await db.select().from(notes).where(eq(notes.weekId, weekId)).limit(1);

    if (existing) {
      const [updated] = await db
        .update(notes)
        .set({ content, updatedAt: new Date() })
        .where(eq(notes.weekId, weekId))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db
        .insert(notes)
        .values({ weekId, content })
        .returning();
      res.json(created);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
