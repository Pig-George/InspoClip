import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { weeks, images, terms as termsTable, notes, tags as tagsTable, imageTags, imageColors as imageColorsTable, videos, videoAnalysisJobs, videoAnalyses, videoTags } from '../db/schema.js';
import { eq, inArray, and, gte, lt, desc } from 'drizzle-orm';

const router = Router();

type ContentDayDirection = 'previous' | 'next';
type ContentDayCandidate = { weekStart: string; dayOfWeek: number | null };

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getContentWeekStarts(
  candidates: ContentDayCandidate[],
  cursor: string,
  direction: ContentDayDirection,
  limit: number,
): string[] {
  const seen = new Set<string>();
  return candidates
    .filter((candidate) => candidate.dayOfWeek !== null)
    .map((candidate) => ({
      weekStart: candidate.weekStart,
      contentDate: addDays(candidate.weekStart, candidate.dayOfWeek ?? 0),
    }))
    .filter((candidate) => direction === 'previous' ? candidate.contentDate < cursor : candidate.contentDate > cursor)
    .sort((a, b) => direction === 'previous'
      ? b.contentDate.localeCompare(a.contentDate)
      : a.contentDate.localeCompare(b.contentDate))
    .reduce<string[]>((acc, candidate) => {
      if (acc.length >= limit || seen.has(candidate.weekStart)) return acc;
      seen.add(candidate.weekStart);
      acc.push(candidate.weekStart);
      return acc;
    }, []);
}

async function loadWeekPayload(week: typeof weeks.$inferSelect) {
  const weekId = week.id;
  const weekImages = await db
    .select()
    .from(images)
    .where(eq(images.weekId, weekId))
    .orderBy(images.sortOrder, images.createdAt);

  const weekVideos = await db.select().from(videos)
    .where(eq(videos.weekId, weekId)).orderBy(videos.sortOrder, videos.createdAt);
  const videoIds = weekVideos.map((video) => video.id);
  const videoJobs = videoIds.length > 0
    ? await db.select().from(videoAnalysisJobs).where(inArray(videoAnalysisJobs.videoId, videoIds)).orderBy(desc(videoAnalysisJobs.createdAt))
    : [];
  const latestJobByVideo = new Map<string, typeof videoJobs[number]>();
  for (const job of videoJobs) if (!latestJobByVideo.has(job.videoId)) latestJobByVideo.set(job.videoId, job);

  const videoAnalysesList = videoIds.length > 0
    ? await db.select().from(videoAnalyses).where(inArray(videoAnalyses.videoId, videoIds))
    : [];
  const analysisByVideo = new Map<string, typeof videoAnalysesList[number]>();
  for (const va of videoAnalysesList) analysisByVideo.set(va.videoId, va);

  const allVideoTags = videoIds.length > 0
    ? await db
      .select({
        videoId: videoTags.videoId,
        tagId: tagsTable.id,
        tagName: tagsTable.name,
        tagColor: tagsTable.color,
      })
      .from(videoTags)
      .innerJoin(tagsTable, eq(videoTags.tagId, tagsTable.id))
      .where(inArray(videoTags.videoId, videoIds))
    : [];
  const tagsByVideo: Record<string, any[]> = {};
  for (const vt of allVideoTags) {
    if (!vt.videoId) continue;
    if (!tagsByVideo[vt.videoId]) tagsByVideo[vt.videoId] = [];
    tagsByVideo[vt.videoId].push({ id: vt.tagId, name: vt.tagName, color: vt.tagColor });
  }

  const imageIds = weekImages.map((img) => img.id);
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
      .where(inArray(imageTags.imageId, imageIds))
    : [];

  const tagsByImage: Record<string, any[]> = {};
  for (const at of allImageTags) {
    if (!at.imageId) continue;
    if (!tagsByImage[at.imageId]) tagsByImage[at.imageId] = [];
    tagsByImage[at.imageId].push({ id: at.tagId, name: at.tagName, color: at.tagColor });
  }

  const allColors = imageIds.length > 0
    ? await db.select().from(imageColorsTable).where(inArray(imageColorsTable.imageId, imageIds)).orderBy(imageColorsTable.position)
    : [];

  const colorsByImage: Record<string, string[]> = {};
  for (const c of allColors) {
    if (!c.imageId) continue;
    if (!colorsByImage[c.imageId]) colorsByImage[c.imageId] = [];
    colorsByImage[c.imageId].push(c.hex);
  }

  const weekNotes = await db.select().from(notes).where(eq(notes.weekId, weekId)).limit(1);

  return {
    week,
    images: weekImages.map((img) => ({
      ...img,
      terms: termsByImage[img.id] || [],
      tags: tagsByImage[img.id] || [],
      colors: colorsByImage[img.id] || [],
    })),
    videos: weekVideos.map((video) => ({
      ...video,
      job: latestJobByVideo.get(video.id) ?? null,
      summary: analysisByVideo.get(video.id)?.summary ?? null,
      tags: tagsByVideo[video.id] || [],
    })),
    notes: weekNotes[0] || null,
  };
}

// GET /api/weeks/content-days - fetch weeks containing content days around a cursor.
router.get('/content-days', async (req: Request, res: Response) => {
  try {
    const cursor = String(req.query.cursor || '');
    const direction = String(req.query.direction || '');
    const rawLimit = Number(req.query.limit ?? 8);
    const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 24)) : 8;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cursor) || isNaN(new Date(cursor).getTime())) {
      res.status(400).json({ error: 'Invalid cursor' });
      return;
    }
    if (direction !== 'previous' && direction !== 'next') {
      res.status(400).json({ error: 'Invalid direction' });
      return;
    }

    const imageCandidates = await db
      .select({ weekStart: weeks.weekStart, dayOfWeek: images.dayOfWeek })
      .from(images)
      .innerJoin(weeks, eq(images.weekId, weeks.id));
    const videoCandidates = await db
      .select({ weekStart: weeks.weekStart, dayOfWeek: videos.dayOfWeek })
      .from(videos)
      .innerJoin(weeks, eq(videos.weekId, weeks.id));

    const weekStarts = getContentWeekStarts(
      [...imageCandidates, ...videoCandidates],
      cursor,
      direction,
      limit,
    );

    if (weekStarts.length === 0) {
      res.json({ weeks: [] });
      return;
    }

    const weekRows = await db.select().from(weeks).where(inArray(weeks.weekStart, weekStarts));
    const weekByStart = new Map(weekRows.map((week) => [week.weekStart, week]));
    const weeksData = await Promise.all(
      weekStarts
        .map((weekStart) => weekByStart.get(weekStart))
        .filter((week): week is typeof weeks.$inferSelect => Boolean(week))
        .map(loadWeekPayload),
    );

    res.json({ weeks: weeksData });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

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

    if (week.length === 0) {
      if (contentOnly) {
        res.json({ week: null, images: [], videos: [], notes: null });
        return;
      }
      const [newWeek] = await db.insert(weeks).values({ weekStart: mondayStr }).returning();
      week = [newWeek];
    }

    const weekId = week[0].id;

    const weekImages = await db
      .select()
      .from(images)
      .where(eq(images.weekId, weekId))
      .orderBy(images.sortOrder, images.createdAt);

    const weekVideos = await db.select().from(videos)
      .where(eq(videos.weekId, weekId)).orderBy(videos.sortOrder, videos.createdAt);
    const videoIds = weekVideos.map((video) => video.id);
    const videoJobs = videoIds.length > 0
      ? await db.select().from(videoAnalysisJobs).where(inArray(videoAnalysisJobs.videoId, videoIds)).orderBy(desc(videoAnalysisJobs.createdAt))
      : [];
    const latestJobByVideo = new Map<string, typeof videoJobs[number]>();
    for (const job of videoJobs) if (!latestJobByVideo.has(job.videoId)) latestJobByVideo.set(job.videoId, job);

    // Fetch video analyses (summary) for the week's videos
    let videoAnalysesList: any[] = [];
    if (videoIds.length > 0) {
      videoAnalysesList = await db.select().from(videoAnalyses).where(inArray(videoAnalyses.videoId, videoIds));
    }
    const analysisByVideo = new Map<string, any>();
    for (const va of videoAnalysesList) analysisByVideo.set(va.videoId, va);

    // Fetch video tags for the week's videos
    let allVideoTags: any[] = [];
    if (videoIds.length > 0) {
      allVideoTags = await db
        .select({
          videoId: videoTags.videoId,
          tagId: tagsTable.id,
          tagName: tagsTable.name,
          tagColor: tagsTable.color,
        })
        .from(videoTags)
        .innerJoin(tagsTable, eq(videoTags.tagId, tagsTable.id))
        .where(inArray(videoTags.videoId, videoIds));
    }
    const tagsByVideo: Record<string, any[]> = {};
    for (const vt of allVideoTags) {
      if (!tagsByVideo[vt.videoId]) tagsByVideo[vt.videoId] = [];
      tagsByVideo[vt.videoId].push({ id: vt.tagId, name: vt.tagName, color: vt.tagColor });
    }

    // In contentOnly mode, return empty if no images
    if (contentOnly && weekImages.length === 0 && weekVideos.length === 0) {
      res.json({ week: null, images: [], videos: [], notes: null });
      return;
    }

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
      videos: weekVideos.map((video) => ({
        ...video,
        job: latestJobByVideo.get(video.id) ?? null,
        summary: analysisByVideo.get(video.id)?.summary ?? null,
        tags: tagsByVideo[video.id] || [],
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
