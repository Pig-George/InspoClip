import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { images, terms as termsTable, imageColors, imageCritiques } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { upload } from '../middleware/upload.js';
import { generateTerms, generateDesignPrompt } from '../services/ai.js';
import { extractColors } from '../services/colors.js';
import { computePhash, areSimilar } from '../services/phash.js';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// POST /api/images/check-similarity — check for similar images before upload
router.post('/check-similarity', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    const phash = await computePhash(file.path);

    const allImages = await db
      .select({ id: images.id, phash: images.phash, filePath: images.filePath })
      .from(images)
      .where(sql`${images.phash} IS NOT NULL`);

    const similar = allImages
      .filter((img) => img.phash && areSimilar(phash, img.phash))
      .slice(0, 5)
      .map((img) => ({ id: img.id, filePath: img.filePath }));

    // Clean up temp file
    await fs.unlink(file.path).catch(() => {});

    res.json({ similar });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No image file provided' });
      return;
    }

    const { weekId, dayOfWeek } = req.body;
    if (!weekId || dayOfWeek === undefined) {
      res.status(400).json({ error: 'weekId and dayOfWeek are required' });
      return;
    }

    const decorations = ['tape', 'pin', 'clip', 'washi', 'stitch', 'staple', 'sticker', 'corner'];
    const decoration = decorations[Math.floor(Math.random() * decorations.length)];

    const [image] = await db
      .insert(images)
      .values({
        weekId,
        dayOfWeek: parseInt(dayOfWeek),
        filePath: file.filename,
        decoration,
      })
      .returning();

    try {
      const keywords = await generateTerms(file.path);
      if (keywords.length > 0) {
        const termRows = keywords.map((kw, i) => ({
          imageId: image.id,
          keyword: kw,
          position: i,
        }));
        await db.insert(termsTable).values(termRows);
      } else {
        console.warn(`AI returned no terms for image ${image.id}`);
        await db.insert(termsTable).values({
          imageId: image.id,
          keyword: 'design element',
          position: 0,
        });
      }
    } catch (aiErr: any) {
      console.error('AI generation failed:', aiErr?.message || aiErr);
      await db.insert(termsTable).values({
        imageId: image.id,
        keyword: 'design element',
        position: 0,
      });
    }

    // Extract colors (non-blocking)
    extractColors(file.path)
      .then(async (colors) => {
        if (colors.length > 0) {
          await db.insert(imageColors).values(
            colors.map((hex, i) => ({ imageId: image.id, hex, position: i }))
          );
        }
      })
      .catch((err) => console.error('Color extraction failed:', err.message));

    // Compute perceptual hash and detect similar images
    let similarImages: any[] = [];
    try {
      const phash = await computePhash(file.path);
      await db.update(images).set({ phash }).where(eq(images.id, image.id));

      const allImages = await db
        .select({ id: images.id, phash: images.phash, filePath: images.filePath })
        .from(images)
        .where(sql`${images.phash} IS NOT NULL AND ${images.id} != ${image.id}`);

      similarImages = allImages
        .filter((img) => img.phash && areSimilar(phash, img.phash))
        .slice(0, 3)
        .map((img) => ({ id: img.id, filePath: img.filePath }));
    } catch (err: any) {
      console.error('Phash failed:', err.message);
    }

    const imageTerms = await db
      .select()
      .from(termsTable)
      .where(eq(termsTable.imageId, image.id))
      .orderBy(termsTable.position);

    res.json({ ...image, terms: imageTerms, similarImages });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const [image] = await db.select().from(images).where(eq(images.id, id)).limit(1);
    if (image) {
      const uploadDir = process.env.UPLOAD_DIR || './uploads';
      const filePath = path.join(uploadDir, image.filePath);
      await fs.unlink(filePath).catch(() => {});
    }

    await db.delete(images).where(eq(images.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// GET /api/images/:id/prompt — get existing prompt
router.get('/:id/prompt', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const existing = await db.select().from(imageCritiques).where(eq(imageCritiques.imageId, id)).limit(1);
    if (existing.length > 0) {
      res.json(existing[0]);
    } else {
      res.json(null);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/images/:id/prompt — generate or get design prompt
router.post('/:id/prompt', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const force = req.query.force === 'true';

    if (!force) {
      const existing = await db.select().from(imageCritiques).where(eq(imageCritiques.imageId, id)).limit(1);
      if (existing.length > 0) {
        res.json(existing[0]);
        return;
      }
    }

    const [image] = await db.select().from(images).where(eq(images.id, id)).limit(1);
    if (!image) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const filePath = `${uploadDir}/${image.filePath}`;

    const prompt = await generateDesignPrompt(filePath);

    // Upsert: delete old if exists, then insert new
    await db.delete(imageCritiques).where(eq(imageCritiques.imageId, id));
    const [saved] = await db.insert(imageCritiques).values({
      imageId: id,
      contentEn: prompt.en,
      contentZh: prompt.zh,
    }).returning();

    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
