import { pgTable, serial, text, timestamp, varchar, primaryKey } from 'drizzle-orm/pg-core';

// Table de notes
export const notes = pgTable('notes', {
  id: text('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Table de hashtags
export const hashtags = pgTable('hashtags', {
  id: serial('id').primaryKey(), 
  name: varchar('name', { length: 100 }).notNull().unique()
});

// Table de catégories
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique()
});

// Table de liens YouTube
export const youtubeUrls = pgTable('youtube_urls', {
  id: serial('id').primaryKey(),
  url: varchar('url', { length: 255 }).notNull(),
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' })
});

// Table de relation many-to-many entre notes et hashtags
export const noteToHashtag = pgTable('note_to_hashtag', {
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  hashtagId: serial('hashtag_id').notNull().references(() => hashtags.id, { onDelete: 'cascade' })
}, (t) => ({
  pk: primaryKey(t.noteId, t.hashtagId)
}));

// Table de relation many-to-many entre notes et categories
export const noteToCategory = pgTable('note_to_category', {
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  categoryId: serial('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' })
}, (t) => ({
  pk: primaryKey(t.noteId, t.categoryId)
}));

// Types exportés pour l'utilisation dans l'application
export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;
export type Hashtag = typeof hashtags.$inferSelect;
export type InsertHashtag = typeof hashtags.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;
export type YoutubeUrl = typeof youtubeUrls.$inferSelect;
export type InsertYoutubeUrl = typeof youtubeUrls.$inferInsert;