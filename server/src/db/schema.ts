import { pgTable, uuid, date, integer, jsonb, smallint, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const weeks = pgTable('weeks', {
  id: uuid('id').defaultRandom().primaryKey(),
  weekStart: date('week_start').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const images = pgTable('images', {
  id: uuid('id').defaultRandom().primaryKey(),
  weekId: uuid('week_id').references(() => weeks.id, { onDelete: 'cascade' }),
  dayOfWeek: smallint('day_of_week').notNull(), // 0=Mon..6=Sun
  filePath: text('file_path').notNull(),
  decoration: text('decoration').notNull(), // 'tape'|'pin'|'clip'|'washi'
  phash: text('phash'),
  ahash: text('ahash'),
  colorhash: text('colorhash'),
  thumbnailPath: text('thumbnail_path'),
  sortOrder: smallint('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const terms = pgTable('terms', {
  id: uuid('id').defaultRandom().primaryKey(),
  imageId: uuid('image_id').references(() => images.id, { onDelete: 'cascade' }),
  keyword: text('keyword').notNull(),
  position: smallint('position').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const notes = pgTable('notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  weekId: uuid('week_id').references(() => weeks.id, { onDelete: 'cascade' }).unique(),
  content: text('content').default('').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const config = pgTable('config', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull().default(''),
});

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color').notNull().default('#c0784a'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const imageTags = pgTable('image_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  imageId: uuid('image_id').references(() => images.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const imageColors = pgTable('image_colors', {
  id: uuid('id').defaultRandom().primaryKey(),
  imageId: uuid('image_id').references(() => images.id, { onDelete: 'cascade' }),
  hex: text('hex').notNull(),
  position: smallint('position').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const imageCritiques = pgTable('image_critiques', {
  id: uuid('id').defaultRandom().primaryKey(),
  imageId: uuid('image_id').references(() => images.id, { onDelete: 'cascade' }).unique(),
  contentEn: text('content_en').notNull(),
  contentZh: text('content_zh').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const videoTags = pgTable('video_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id').references(() => videos.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
});

export const videos = pgTable('videos', {
  id: uuid('id').defaultRandom().primaryKey(),
  weekId: uuid('week_id').references(() => weeks.id, { onDelete: 'cascade' }),
  dayOfWeek: smallint('day_of_week'),
  sortOrder: smallint('sort_order').notNull().default(0),
  filePath: text('file_path').notNull(),
  thumbnailPath: text('thumbnail_path'),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  durationMs: integer('duration_ms').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  source: text('source').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const videoAnalysisJobs = pgTable('video_analysis_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'),
  progress: smallint('progress').notNull().default(0),
  model: text('model').notNull(),
  fps: smallint('fps').notNull().default(3),
  attemptCount: smallint('attempt_count').notNull().default(0),
  errorMessage: text('error_message'),
  rawResponse: text('raw_response'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const videoAnalyses = pgTable('video_analyses', {
  id: uuid('id').defaultRandom().primaryKey(),
  videoId: uuid('video_id').notNull().references(() => videos.id, { onDelete: 'cascade' }).unique(),
  summary: text('summary').notNull(),
  visualStyle: jsonb('visual_style').notNull(),
  analysis: jsonb('analysis').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const videoPromptOutputs = pgTable('video_prompt_outputs', {
  id: uuid('id').defaultRandom().primaryKey(),
  analysisId: uuid('analysis_id').notNull().references(() => videoAnalyses.id, { onDelete: 'cascade' }),
  purpose: text('purpose').notNull(),
  target: text('target').notNull().default(''),
  contentEn: text('content_en').notNull(),
  contentZh: text('content_zh').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  outputKey: uniqueIndex('video_prompt_outputs_key').on(table.analysisId, table.purpose, table.target),
}));
