import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Example schema — replace with your own tables.
// Uses the drizzle-orm 0.45.2 relations() API.
// WARNING: the @rc docs show a different API; pin drizzle-orm to 0.45.2 and
// use relations() as shown below.
//
// The default scaffold declares no App Database (AD-18). Add a D1 binding
// in wrangler.jsonc and run `npx drizzle-kit generate` when you need one.

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
});

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: integer('author_id')
    .notNull()
    .references(() => users.id),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));
