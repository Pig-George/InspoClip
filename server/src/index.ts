import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db/index.js';
import { config as configTable } from './db/schema.js';
import { eq } from 'drizzle-orm';
import weeksRouter from './routes/weeks.js';
import imagesRouter from './routes/images.js';
import termsRouter from './routes/terms.js';
import configRouter from './routes/config.js';
import searchRouter from './routes/search.js';
import tagsRouter from './routes/tags.js';

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
  `);
  console.log('Database tables ready');

  // Seed default config
  const defaults: Record<string, string> = {
    AI_PROVIDER: process.env.AI_PROVIDER || 'openai',
    AI_API_KEY: process.env.AI_API_KEY || 'sk-placeholder',
    AI_API_BASE: process.env.AI_API_BASE || 'https://api.deepseek.com/v1',
    AI_MODEL: process.env.AI_MODEL || 'deepseek-chat',
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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

async function start() {
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
}

start();
