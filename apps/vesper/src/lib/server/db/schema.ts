import { pgTable, uuid, text, timestamp, unique, boolean, jsonb, integer } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
	id: uuid('id').defaultRandom().primaryKey(),
	userId: uuid('user_id').notNull(), // References auth.users.id from Supabase
	name: text('name').notNull(),
	shareCode: text('share_code').unique(), // 6-digit multiplayer share code
	state: text('state').default('draft'), // 'draft' | 'published'
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

// AI Chat Conversations - Multiple conversations per project
export const conversations = pgTable('conversations', {
	id: uuid('id').defaultRandom().primaryKey(),
	projectId: uuid('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	title: text('title').notNull(), // Auto-generated or user-set (e.g., "Add jump feature")
	isArchived: boolean('is_archived').default(false).notNull(), // Soft delete
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Chat Messages - Stores Vercel AI SDK UIMessage[] as jsonb
export const chatMessages = pgTable('chat_messages', {
	id: uuid('id').defaultRandom().primaryKey(),
	conversationId: uuid('conversation_id')
		.notNull()
		.references(() => conversations.id, { onDelete: 'cascade' }),
	messages: jsonb('messages').notNull().default('[]'), // UIMessage[] from @ai-sdk/svelte
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
	// One messages row per conversation (stores entire message array)
	uniqueConversation: unique().on(table.conversationId)
}));

// Project Assets - Images, audio, and other game assets
export const assets = pgTable('assets', {
	id: uuid('id').defaultRandom().primaryKey(),
	projectId: uuid('project_id')
		.notNull()
		.references(() => projects.id, { onDelete: 'cascade' }),
	filename: text('filename').notNull(), // 'player.png', 'jump.mp3'
	storagePath: text('storage_path').notNull(), // Supabase Storage path: 'project-assets/{projectId}/{filename}'
	fileType: text('file_type').notNull(), // 'image' | 'audio'
	assetType: text('asset_type').notNull(), // 'image' | 'audio' | 'spritesheet' | 'atlas' (future expansion)
	sizeBytes: integer('size_bytes').notNull(), // File size for quota tracking
	metadata: jsonb('metadata'), // Optional: { width, height, frameWidth, frameHeight, duration, ... }
	createdAt: timestamp('created_at').defaultNow().notNull()
});
