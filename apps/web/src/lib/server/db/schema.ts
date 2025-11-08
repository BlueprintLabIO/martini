import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id').notNull(), // References auth.users.id from Supabase
	name: text('name').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const files = pgTable('files', {
	id: uuid('id').defaultRandom().primaryKey(),
	projectId: uuid('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	path: text('path').notNull(), // '/src/scenes/GameScene.js'
	content: text('content').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
	uniquePath: unique().on(table.projectId, table.path)
}));
