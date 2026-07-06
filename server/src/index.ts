import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdir } from 'node:fs/promises';
import { db } from './db/index.js';
import { config as configTable } from './db/schema.js';
import { eq } from 'drizzle-orm';
import weeksRouter from './routes/weeks.js';
import imagesRouter from './routes/images.js';
import termsRouter from './routes/terms.js';
import configRouter from './routes/config.js';
import searchRouter from './routes/search.js';
import tagsRouter from './routes/tags.js';
import exportRouter from './routes/export.js';
import { createVideosRouter } from './routes/videos.js';
import { createVideoJobsRouter } from './routes/video-jobs.js';
import { DrizzleVideoRepository } from './video/repository.js';
import { VideoWorker } from './video/worker.js';
import { createVideoAiService } from './services/video-ai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// Auto-create tables on startup
async function initDB() {
  const { sql } = await import('drizzle-orm');
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS weeks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_start DATE NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS images (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_id UUID REFERENCES weeks(id) ON DELETE CASCADE,
      day_of_week SMALLINT NOT NULL,
      file_path TEXT NOT NULL,
      decoration TEXT NOT NULL,
      phash TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS terms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      image_id UUID REFERENCES images(id) ON DELETE CASCADE,
      keyword TEXT NOT NULL,
      position SMALLINT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      week_id UUID REFERENCES weeks(id) ON DELETE CASCADE UNIQUE,
      content TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#c0784a',
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS image_tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      image_id UUID REFERENCES images(id) ON DELETE CASCADE,
      tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(image_id, tag_id)
    );
    CREATE TABLE IF NOT EXISTS image_colors (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      image_id UUID REFERENCES images(id) ON DELETE CASCADE,
      hex TEXT NOT NULL,
      position SMALLINT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS image_critiques (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      image_id UUID REFERENCES images(id) ON DELETE CASCADE UNIQUE,
      content_en TEXT NOT NULL,
      content_zh TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS videos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), file_path TEXT NOT NULL, thumbnail_path TEXT,
      original_name TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
      source TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS video_analysis_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending', progress SMALLINT NOT NULL DEFAULT 0, model TEXT NOT NULL,
      fps SMALLINT NOT NULL DEFAULT 3, attempt_count SMALLINT NOT NULL DEFAULT 0, error_message TEXT,
      raw_response TEXT, started_at TIMESTAMP, completed_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS video_analyses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), video_id UUID NOT NULL UNIQUE REFERENCES videos(id) ON DELETE CASCADE,
      summary TEXT NOT NULL, visual_style JSONB NOT NULL, analysis JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS video_prompt_outputs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), analysis_id UUID NOT NULL REFERENCES video_analyses(id) ON DELETE CASCADE,
      purpose TEXT NOT NULL, target TEXT NOT NULL DEFAULT '', locale TEXT NOT NULL DEFAULT 'zh',
      content TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(analysis_id, purpose, target, locale)
    );
    ALTER TABLE images ADD COLUMN IF NOT EXISTS phash TEXT;
    ALTER TABLE images ADD COLUMN IF NOT EXISTS ahash TEXT;
    ALTER TABLE images ADD COLUMN IF NOT EXISTS colorhash TEXT;
    ALTER TABLE images ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;
    ALTER TABLE images ADD COLUMN IF NOT EXISTS sort_order SMALLINT NOT NULL DEFAULT 0;
  `);
  console.log('Database tables ready');

  // Seed default config
  const defaults: Record<string, string> = {
    AI_PROVIDER: process.env.AI_PROVIDER || 'openai',
    AI_API_KEY: process.env.AI_API_KEY || 'sk-placeholder',
    AI_API_BASE: process.env.AI_API_BASE || 'https://api.openai.com/v1',
    AI_MODEL: process.env.AI_MODEL || 'gpt-5.4',
    VIDEO_AI_PROVIDER: process.env.VIDEO_AI_PROVIDER || 'openai-compatible',
    VIDEO_AI_API_KEY: process.env.VIDEO_AI_API_KEY || '',
    VIDEO_AI_API_BASE: process.env.VIDEO_AI_API_BASE || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    VIDEO_AI_MODEL: process.env.VIDEO_AI_MODEL || 'qwen3.7-plus',
    VIDEO_AI_FPS: process.env.VIDEO_AI_FPS || '3',
  };
  for (const [key, value] of Object.entries(defaults)) {
    const rows = await db.select().from(configTable).where(eq(configTable.key, key)).limit(1);
    if (rows.length === 0) {
      await db.insert(configTable).values({ key, value });
    }
  }
  console.log('Config seeded');
}

app.use(cors());
app.use(express.json());

const uploadDir = process.env.UPLOAD_DIR || './uploads';
app.use('/api/uploads', express.static(path.resolve(uploadDir)));

app.use('/api/weeks', weeksRouter);
app.use('/api/images', imagesRouter);
app.use('/api/terms', termsRouter);
app.use('/api/config', configRouter);
app.use('/api/search', searchRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/export', exportRouter);
const videoRepository = new DrizzleVideoRepository();
app.use('/api/videos', createVideosRouter({ repository: videoRepository }));
app.use('/api/video-jobs', createVideoJobsRouter(videoRepository));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
  await Promise.all([
    mkdir(process.env.UPLOAD_DIR || './uploads', { recursive: true }),
    mkdir(process.env.VIDEO_UPLOAD_DIR || './videos', { recursive: true }),
  ]);
  // Retry DB init with backoff (Docker DNS may not resolve immediately)
  for (let i = 0; i < 5; i++) {
    try {
      await initDB();
      console.log('Database initialized');
      break;
    } catch (err: any) {
      console.error(`DB init attempt ${i + 1}/5 failed:`, err.message);
      if (i < 4) await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
    }
  }

  app.listen(PORT, () => {
    console.log(`InspoClip server running on http://localhost:${PORT}`);
  });
  const publicBaseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`;
  const worker = new VideoWorker(videoRepository, {
    analyzeVideo: async (input) => (await createVideoAiService()).analyzeVideo(input),
  }, { videoUrlFor: (video) => `${publicBaseUrl}/api/videos/${video.id}/content` });
  void worker.start().catch((error) => console.error('Video worker stopped:', error));
}

start();
