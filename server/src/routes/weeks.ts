import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { weeks, images, terms as termsTable, notes, tags as tagsTable, imageTags, imageColors as imageColorsTable } from '../db/schema.js';
import { eq, inArray, and, gte, lt } from 'drizzle-orm';

const router = Router();

// GET /api/weeks/:date — fetch week data by any date within the week
// Query params:
//   contentOnly=true — only return days with images (don't create empty weeks)
router.get('/:date', async (req: Request, res: Response) => {
  try {
    const dateStr = req.params.date as string;
    const contentOnly = req.query.contentOnly === 'true';
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

    if (contentOnly && week.length === 0) {
      // Don't create empty weeks in content-only mode
      res.json({ week: null, images: [], notes: null });
      return;
    }

    if (week.length === 0) {
      const [newWeek] = await db.insert(weeks).values({ weekStart: mondayStr }).returning();
      week = [newWeek];
    }

    const weekId = week[0].id;

    const weekImages = await db
      .select()
      .from(images)
      .where(eq(images.weekId, weekId))
      .orderBy(images.sortOrder, images.createdAt);

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
      const imgId = t.imageId;
      if (!imgId) continue;
      if (!termsByImage[imgId]) termsByImage[imgId] = [];
      termsByImage[imgId].push(t);
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

// GET /api/weeks/month/:yearMonth — get all images for a month
router.get('/month/:yearMonth', async (req: Request, res: Response) => {
  try {
    const yearMonth = req.params.yearMonth as string;
    const [year, month] = yearMonth.split('-').map(Number);
    if (!year || !month || month < 1 || month > 12) {
      res.status(400).json({ error: 'Invalid yearMonth format. Use YYYY-MM' });
      return;
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

    const monthWeeks = await db
      .select()
      .from(weeks)
      .where(and(gte(weeks.weekStart, startDate), lt(weeks.weekStart, endDate)));

    const weekIds = monthWeeks.map((w) => w.id);

    if (weekIds.length === 0) {
      res.json({ month: yearMonth, weeks: [] });
      return;
    }

    const monthImages = await db
      .select()
      .from(images)
      .where(inArray(images.weekId, weekIds))
      .orderBy(images.createdAt);

    const imageIds = monthImages.map((img) => img.id);

    const allTerms = imageIds.length > 0
      ? await db.select().from(termsTable).where(inArray(termsTable.imageId, imageIds)).orderBy(termsTable.position)
      : [];

    const termsByImage: Record<string, any[]> = {};
    for (const t of allTerms) {
      const imgId = t.imageId;
      if (!imgId) continue;
      if (!termsByImage[imgId]) termsByImage[imgId] = [];
      termsByImage[imgId].push(t);
    }

    const weeksData = monthWeeks.map((week) => ({
      week,
      images: monthImages
        .filter((img) => img.weekId === week.id)
        .map((img) => ({ ...img, terms: termsByImage[img.id] || [] })),
    }));

    res.json({ month: yearMonth, weeks: weeksData });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
