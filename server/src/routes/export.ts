import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import {
  weeks,
  images,
  terms as termsTable,
  videos,
  videoAnalyses,
  videoAnalysisJobs,
  videoTags,
  tags as tagsTable,
} from '../db/schema.js';
import { eq, inArray, desc } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
import type { LocalizedString, VideoAnalysis } from '../ai/types.js';
import { cardSummaryFromAnalysis } from '../video/summary.js';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

const router = Router();

type ExportImage = {
  id: string;
  dayOfWeek: number | null;
  filePath: string;
};

type ExportVideo = {
  id: string;
  dayOfWeek: number | null;
  filePath: string;
  thumbnailPath: string | null;
  originalName: string;
  durationMs: number;
  width: number;
  height: number;
  mimeType: string;
  sizeBytes: number;
  source: string;
};

type ExportVideoAnalysis = {
  summary: string;
  analysis: unknown;
};

type ExportVideoJob = {
  id: string;
  status: string;
  progress: number;
  model: string;
  fps: number;
  attemptCount?: number;
  errorMessage?: string | null;
};

type ExportTag = {
  id: string;
  name: string;
  color: string;
};

interface ExportBuildInput {
  week?: unknown;
  mondayStr: string;
  exportedAt?: string;
  dayNames: string[];
  weekImages: ExportImage[];
  termsByImage: Record<string, string[]>;
  weekVideos: ExportVideo[];
  videoAnalysisById: Map<string, ExportVideoAnalysis>;
  videoTagsById: Record<string, ExportTag[]>;
  latestJobByVideo: Map<string, ExportVideoJob>;
}

interface WeekExportData {
  week: string;
  exportedAt: string;
  images: ReturnType<typeof buildExportJson>['images'];
  videos: ReturnType<typeof buildExportJson>['videos'];
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDuration(durationMs: number): string {
  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function dayName(dayNames: string[], dayOfWeek: number | null | undefined): string {
  return typeof dayOfWeek === 'number' ? dayNames[dayOfWeek] ?? 'Unassigned' : 'Unassigned';
}

function localizedInline(value: LocalizedString | null | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value.en && value.zh) return `${value.en} / ${value.zh}`;
  return value.en || value.zh || '';
}

function videoAnalysisValue(record: ExportVideoAnalysis | undefined): VideoAnalysis | null {
  const analysis = record?.analysis;
  return analysis && typeof analysis === 'object' ? analysis as VideoAnalysis : null;
}

function videoExportItem(input: ExportBuildInput, video: ExportVideo) {
  const analysisRecord = input.videoAnalysisById.get(video.id);
  const analysis = videoAnalysisValue(analysisRecord);
  return {
    day: dayName(input.dayNames, video.dayOfWeek),
    fileName: video.filePath,
    videoPath: `videos/${video.filePath}`,
    thumbnailPath: video.thumbnailPath ? `video-thumbnails/${video.thumbnailPath}` : null,
    originalName: video.originalName,
    durationMs: video.durationMs,
    duration: formatDuration(video.durationMs),
    width: video.width,
    height: video.height,
    mimeType: video.mimeType,
    sizeBytes: video.sizeBytes,
    source: video.source,
    summary: cardSummaryFromAnalysis(analysisRecord),
    tags: input.videoTagsById[video.id] || [],
    job: input.latestJobByVideo.get(video.id) ?? null,
    analysis,
  };
}

export function buildExportJson(input: ExportBuildInput) {
  return {
    week: input.mondayStr,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    images: input.weekImages.map((img) => ({
      day: dayName(input.dayNames, img.dayOfWeek),
      fileName: img.filePath,
      imagePath: `images/${img.filePath}`,
      terms: input.termsByImage[img.id] || [],
    })),
    videos: input.weekVideos.map((video) => videoExportItem(input, video)),
  };
}

export function buildAllExportJson(input: { exportedAt?: string; weeks: WeekExportData[] }) {
  return {
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    weeks: input.weeks,
  };
}

export function buildAllExportMarkdown(input: { exportedAt?: string; weeks: { mondayStr: string; markdown: string }[] }): string {
  let md = '# InspoClip - All Inspirations\n\n';
  md += `> Exported on ${input.exportedAt ?? new Date().toISOString()}\n\n`;
  for (const week of input.weeks) {
    md += `---\n\n`;
    md += week.markdown.replace(/^# InspoClip - Week of /, '# Week of ');
    if (!md.endsWith('\n')) md += '\n';
    md += '\n';
  }
  return md;
}

export function buildExportMarkdown(input: ExportBuildInput): string {
  let md = `# InspoClip - Week of ${input.mondayStr}\n\n`;
  md += `> Exported on ${input.exportedAt ?? new Date().toISOString()}\n\n`;

  const imagesByDay: Record<number, ExportImage[]> = {};
  for (const img of input.weekImages) {
    if (typeof img.dayOfWeek !== 'number') continue;
    if (!imagesByDay[img.dayOfWeek]) imagesByDay[img.dayOfWeek] = [];
    imagesByDay[img.dayOfWeek].push(img);
  }

  const videosByDay: Record<number, ExportVideo[]> = {};
  for (const video of input.weekVideos) {
    if (typeof video.dayOfWeek !== 'number') continue;
    if (!videosByDay[video.dayOfWeek]) videosByDay[video.dayOfWeek] = [];
    videosByDay[video.dayOfWeek].push(video);
  }

  for (let d = 0; d < 7; d++) {
    const dayImages = imagesByDay[d] || [];
    const dayVideos = videosByDay[d] || [];
    if (dayImages.length === 0 && dayVideos.length === 0) continue;

    md += `## ${input.dayNames[d]}\n\n`;

    if (dayImages.length > 0) {
      md += '### Images\n\n';
      for (const img of dayImages) {
        const terms = input.termsByImage[img.id] || [];
        md += `![${terms[0] || 'image'}](images/${img.filePath})\n`;
        if (terms.length > 0) {
          md += `- **Terms:** ${terms.join(', ')}\n`;
        }
        md += '\n';
      }
    }

    if (dayVideos.length > 0) {
      md += '### Videos\n\n';
      for (const video of dayVideos) {
        const item = videoExportItem(input, video);
        md += `- [${video.originalName || video.filePath}](${item.videoPath}) (${item.duration})\n`;
        if (item.thumbnailPath) md += `  - **Thumbnail:** ${item.thumbnailPath}\n`;
        if (item.summary) md += `  - **Summary:** ${localizedInline(item.summary)}\n`;
        if (item.tags.length > 0) md += `  - **Tags:** ${item.tags.map((tag) => tag.name).join(', ')}\n`;
        if (item.job) md += `  - **Analysis job:** ${item.job.status} (${item.job.progress}%)\n`;
        if (item.analysis?.stages?.length) {
          md += '  - **Stages:**\n';
          for (const stage of item.analysis.stages) {
            md += `    - ${stage.startTime.toFixed(1)}s-${stage.endTime.toFixed(1)}s: ${localizedInline(stage.title)}\n`;
            if (stage.actions.length > 0) {
              for (const action of stage.actions) {
                md += `      - ${localizedInline(action.subject)}: ${localizedInline(action.action)} · ${action.durationMs}ms · ${action.easing}\n`;
              }
            }
          }
        }
        md += '\n';
      }
    }
  }

  return md;
}

async function getWeekData(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  const monday = getMonday(date);
  const mondayStr = formatDate(monday);

  const [week] = await db.select().from(weeks).where(eq(weeks.weekStart, mondayStr)).limit(1);
  if (!week) return null;

  const weekImages = await db.select().from(images).where(eq(images.weekId, week.id)).orderBy(images.dayOfWeek, images.createdAt);
  const imageIds = weekImages.map((img) => img.id);

  const allTerms = imageIds.length > 0
    ? await db.select().from(termsTable).where(inArray(termsTable.imageId, imageIds)).orderBy(termsTable.position)
    : [];

  const termsByImage: Record<string, string[]> = {};
  for (const term of allTerms) {
    const imgId = term.imageId;
    if (!imgId) continue;
    if (!termsByImage[imgId]) termsByImage[imgId] = [];
    termsByImage[imgId].push(term.keyword);
  }

  const weekVideos = await db.select().from(videos).where(eq(videos.weekId, week.id)).orderBy(videos.dayOfWeek, videos.createdAt);
  const videoIds = weekVideos.map((video) => video.id);
  const allVideoAnalyses = videoIds.length > 0
    ? await db.select().from(videoAnalyses).where(inArray(videoAnalyses.videoId, videoIds))
    : [];
  const allVideoJobs = videoIds.length > 0
    ? await db.select().from(videoAnalysisJobs).where(inArray(videoAnalysisJobs.videoId, videoIds)).orderBy(desc(videoAnalysisJobs.createdAt))
    : [];
  const allVideoTags = videoIds.length > 0
    ? await db
      .select({ videoId: videoTags.videoId, id: tagsTable.id, name: tagsTable.name, color: tagsTable.color })
      .from(videoTags)
      .innerJoin(tagsTable, eq(videoTags.tagId, tagsTable.id))
      .where(inArray(videoTags.videoId, videoIds))
    : [];

  const videoAnalysisById = new Map<string, ExportVideoAnalysis>();
  for (const analysis of allVideoAnalyses) {
    videoAnalysisById.set(analysis.videoId, {
      summary: analysis.summary,
      analysis: analysis.analysis,
    });
  }

  const latestJobByVideo = new Map<string, ExportVideoJob>();
  for (const job of allVideoJobs) {
    if (!latestJobByVideo.has(job.videoId)) {
      latestJobByVideo.set(job.videoId, job as ExportVideoJob);
    }
  }

  const videoTagsById: Record<string, ExportTag[]> = {};
  for (const tag of allVideoTags) {
    if (!tag.videoId) continue;
    if (!videoTagsById[tag.videoId]) videoTagsById[tag.videoId] = [];
    videoTagsById[tag.videoId].push({ id: tag.id, name: tag.name, color: tag.color });
  }

  return {
    week,
    weekImages: weekImages as ExportImage[],
    termsByImage,
    weekVideos: weekVideos as ExportVideo[],
    videoAnalysisById,
    latestJobByVideo,
    videoTagsById,
    mondayStr,
  };
}

async function getAllExportWeeks() {
  const allWeeks = await db.select().from(weeks).orderBy(weeks.weekStart);
  const result: NonNullable<Awaited<ReturnType<typeof getWeekData>>>[] = [];
  for (const week of allWeeks) {
    const data = await getWeekData(week.weekStart);
    if (!data) continue;
    if (data.weekImages.length === 0 && data.weekVideos.length === 0) continue;
    result.push(data);
  }
  return result;
}

async function addImagesToArchive(archive: any, weekImages: ExportImage[], uploadDir: string) {
  const added: string[] = [];
  for (const img of weekImages) {
    const filePath = path.join(uploadDir, img.filePath);
    try {
      await fs.access(filePath);
      archive.file(filePath, { name: `images/${img.filePath}` });
      added.push(img.filePath);
    } catch {
      // File missing; keep metadata but skip binary asset.
    }
  }
  return added;
}

async function addVideosToArchive(archive: any, weekVideos: ExportVideo[], videoDir: string) {
  const added: string[] = [];
  for (const video of weekVideos) {
    const filePath = path.join(videoDir, video.filePath);
    try {
      await fs.access(filePath);
      archive.file(filePath, { name: `videos/${video.filePath}` });
      added.push(video.filePath);
    } catch {
      // File missing; keep metadata but skip binary asset.
    }

    if (!video.thumbnailPath) continue;
    const thumbnailPath = path.join(videoDir, video.thumbnailPath);
    try {
      await fs.access(thumbnailPath);
      archive.file(thumbnailPath, { name: `video-thumbnails/${video.thumbnailPath}` });
      added.push(video.thumbnailPath);
    } catch {
      // Thumbnail missing; keep metadata but skip binary asset.
    }
  }
  return added;
}

// GET /api/export/week/:date?format=markdown|json|zip
router.get('/week/:date', async (req: Request, res: Response) => {
  try {
    const dateStr = req.params.date as string;
    const format = (req.query.format as string) || 'markdown';

    const data = await getWeekData(dateStr);
    if (!data) {
      res.status(404).json({ error: 'Week not found' });
      return;
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const videoDir = process.env.VIDEO_UPLOAD_DIR || './videos';
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const exportedAt = new Date().toISOString();
    const buildInput: ExportBuildInput = { ...data, dayNames, exportedAt };

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="inspoclip-${data.mondayStr}.zip"`);

    const archive = new ZipArchive();
    archive.pipe(res);

    await addImagesToArchive(archive, data.weekImages, uploadDir);
    await addVideosToArchive(archive, data.weekVideos, videoDir);

    if (format === 'json') {
      archive.append(JSON.stringify(buildExportJson(buildInput), null, 2), { name: 'data.json' });
    } else if (format === 'zip') {
      archive.append(JSON.stringify(buildExportJson(buildInput), null, 2), { name: 'data.json' });
      archive.append(buildExportMarkdown(buildInput), { name: 'inspoclip.md' });
    } else {
      archive.append(buildExportMarkdown(buildInput), { name: 'inspoclip.md' });
    }

    await archive.finalize();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/all', async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) || 'markdown';
    const weeksData = await getAllExportWeeks();
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const videoDir = process.env.VIDEO_UPLOAD_DIR || './videos';
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const exportedAt = new Date().toISOString();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="inspoclip-all.zip"`);

    const archive = new ZipArchive();
    archive.pipe(res);

    const weekJsons: WeekExportData[] = [];
    const weekMarkdowns: { mondayStr: string; markdown: string }[] = [];

    for (const data of weeksData) {
      await addImagesToArchive(archive, data.weekImages, uploadDir);
      await addVideosToArchive(archive, data.weekVideos, videoDir);
      const buildInput: ExportBuildInput = { ...data, dayNames, exportedAt };
      weekJsons.push(buildExportJson(buildInput));
      weekMarkdowns.push({ mondayStr: data.mondayStr, markdown: buildExportMarkdown(buildInput) });
    }

    if (format === 'json') {
      archive.append(JSON.stringify(buildAllExportJson({ exportedAt, weeks: weekJsons }), null, 2), { name: 'data.json' });
    } else if (format === 'zip') {
      archive.append(JSON.stringify(buildAllExportJson({ exportedAt, weeks: weekJsons }), null, 2), { name: 'data.json' });
      archive.append(buildAllExportMarkdown({ exportedAt, weeks: weekMarkdowns }), { name: 'inspoclip.md' });
    } else {
      archive.append(buildAllExportMarkdown({ exportedAt, weeks: weekMarkdowns }), { name: 'inspoclip.md' });
    }

    await archive.finalize();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
