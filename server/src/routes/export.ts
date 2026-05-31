import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { weeks, images, terms as termsTable } from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

const router = Router();

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

async function getWeekData(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = date.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - daysFromMonday);
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

  return { week, weekImages, termsByImage, mondayStr };
}

// Add images to archive, return list of added files
async function addImagesToArchive(archive: any, weekImages: any[], uploadDir: string) {
  const added: string[] = [];
  for (const img of weekImages) {
    const filePath = path.join(uploadDir, img.filePath);
    try {
      await fs.access(filePath);
      archive.file(filePath, { name: `images/${img.filePath}` });
      added.push(img.filePath);
    } catch { /* file missing, skip */ }
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

    const { weekImages, termsByImage, mondayStr } = data;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // All formats export as ZIP with images folder
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="inspoclip-${mondayStr}.zip"`);

    const archive = new ZipArchive();
    archive.pipe(res);

    // Add images
    await addImagesToArchive(archive, weekImages, uploadDir);

    if (format === 'json') {
      // JSON with relative image paths
      const jsonData = {
        week: mondayStr,
        exportedAt: new Date().toISOString(),
        images: weekImages.map((img) => ({
          day: dayNames[img.dayOfWeek],
          fileName: img.filePath,
          imagePath: `images/${img.filePath}`,
          terms: termsByImage[img.id] || [],
        })),
      };
      archive.append(JSON.stringify(jsonData, null, 2), { name: 'data.json' });

    } else {
      // Markdown with relative image paths
      let md = `# InspoClip - Week of ${mondayStr}\n\n`;
      md += `> Exported on ${new Date().toISOString()}\n\n`;

      const byDay: Record<number, typeof weekImages> = {};
      for (const img of weekImages) {
        if (!byDay[img.dayOfWeek]) byDay[img.dayOfWeek] = [];
        byDay[img.dayOfWeek].push(img);
      }

      for (let d = 0; d < 7; d++) {
        const dayImages = byDay[d] || [];
        if (dayImages.length === 0) continue;

        md += `## ${dayNames[d]}\n\n`;
        for (const img of dayImages) {
          const terms = termsByImage[img.id] || [];
          md += `![${terms[0] || 'image'}](images/${img.filePath})\n`;
          if (terms.length > 0) {
            md += `- **Terms:** ${terms.join(', ')}\n`;
          }
          md += '\n';
        }
      }

      archive.append(md, { name: 'inspoclip.md' });
    }

    await archive.finalize();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
