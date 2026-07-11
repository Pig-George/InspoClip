import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { images as imagesTable, terms as termsTable, tags as tagsTable, imageTags, imageColors as imageColorsTable, videos as videosTable, videoAnalyses, videoTags, videoAnalysisJobs } from '../db/schema.js';
import { ilike, inArray, eq, desc, or, sql } from 'drizzle-orm';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) { res.json({ images: [], videos: [] }); return; }

    // --- Search images by terms ---
    const matchingTerms = await db
      .select()
      .from(termsTable)
      .where(ilike(termsTable.keyword, `%${q}%`))
      .limit(50);

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

    let allImageTags: any[] = [];
    if (imageIdList.length > 0) {
      allImageTags = await db
        .select({ imageId: imageTags.imageId, tagId: tagsTable.id, tagName: tagsTable.name, tagColor: tagsTable.color })
        .from(imageTags)
        .innerJoin(tagsTable, eq(imageTags.tagId, tagsTable.id))
        .where(inArray(imageTags.imageId, imageIdList));
    }

    const tagsByImage: Record<string, any[]> = {};
    for (const at of allImageTags) {
      if (!tagsByImage[at.imageId]) tagsByImage[at.imageId] = [];
      tagsByImage[at.imageId].push({ id: at.tagId, name: at.tagName, color: at.tagColor });
    }

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

    const imageResults = matchingImages.map((img) => ({
      ...img,
      terms: termsByImage[img.id] || [],
      tags: tagsByImage[img.id] || [],
      colors: colorsByImage[img.id] || [],
    }));

    // --- Search videos by analysis summary ---
    const matchingAnalyses = await db
      .select()
      .from(videoAnalyses)
      .where(or(
        ilike(videoAnalyses.summary, `%${q}%`),
        sql`CAST(${videoAnalyses.analysis} AS TEXT) ILIKE ${`%${q}%`}`,
      ))
      .limit(20);

    const videoIds = matchingAnalyses.map((a) => a.videoId);

    let matchingVideos: any[] = [];
    let allVideoJobs: any[] = [];
    let allVideoTags: any[] = [];
    if (videoIds.length > 0) {
      matchingVideos = await db
        .select()
        .from(videosTable)
        .where(inArray(videosTable.id, videoIds))
        .limit(20);

      allVideoJobs = await db
        .select()
        .from(videoAnalysisJobs)
        .where(inArray(videoAnalysisJobs.videoId, videoIds))
        .orderBy(desc(videoAnalysisJobs.createdAt));

      allVideoTags = await db
        .select({ videoId: videoTags.videoId, tagId: tagsTable.id, tagName: tagsTable.name, tagColor: tagsTable.color })
        .from(videoTags)
        .innerJoin(tagsTable, eq(videoTags.tagId, tagsTable.id))
        .where(inArray(videoTags.videoId, videoIds));
    }

    const latestJobByVideo = new Map<string, any>();
    for (const job of allVideoJobs) if (!latestJobByVideo.has(job.videoId)) latestJobByVideo.set(job.videoId, job);

    const tagsByVideo: Record<string, any[]> = {};
    for (const vt of allVideoTags) {
      if (!tagsByVideo[vt.videoId]) tagsByVideo[vt.videoId] = [];
      tagsByVideo[vt.videoId].push({ id: vt.tagId, name: vt.tagName, color: vt.tagColor });
    }

    const analysisByVideo = new Map(matchingAnalyses.map((a) => [a.videoId, a]));

    const videoResults = matchingVideos.map((video) => ({
      ...video,
      job: latestJobByVideo.get(video.id) ?? null,
      summary: analysisByVideo.get(video.id)?.summary ?? null,
      tags: tagsByVideo[video.id] || [],
    }));

    res.json({ images: imageResults, videos: videoResults });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

export default router;
