import { pgTable, uuid, date, smallint, text, timestamp } from 'drizzle-orm/pg-core';

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
