import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { weeks, images, terms as termsTable } from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';

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

// GET /api/export/week/:date?format=markdown|json
router.get('/week/:date', async (req: Request, res: Response) => {
  try {
    const dateStr = req.params.date as string;
    const format = (req.query.format as string) || 'markdown';
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    const mondayStr = date.toISOString().split('T')[0];

    console.error('[Export] dateStr:', dateStr, 'mondayStr:', mondayStr);
    const [week] = await db.select().from(weeks).where(eq(weeks.weekStart, mondayStr)).limit(1);
    console.error('[Export] week found:', !!week, week?.id);
    if (!week) {
      res.status(404).json({ error: 'Week not found' });
      return;
    }

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

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    if (format === 'json') {
      const data = {
        week: mondayStr,
        exportedAt: new Date().toISOString(),
        images: weekImages.map((img) => ({
          day: dayNames[img.dayOfWeek],
          filePath: img.filePath,
          terms: termsByImage[img.id] || [],
        })),
      };
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="inspoclip-${mondayStr}.json"`);
      res.json(data);
    } else {
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
          md += `- ![${terms[0] || 'image'}](uploads/${img.filePath})\n`;
          if (terms.length > 0) {
            md += `  - Tags: ${terms.join(', ')}\n`;
          }
          md += '\n';
        }
      }

      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="inspoclip-${mondayStr}.md"`);
      res.send(md);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
