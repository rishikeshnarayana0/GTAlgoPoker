import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'verified', 'rejected'] }).notNull(),
  role: text('role', { enum: ['user', 'admin'] }).notNull().default('user'),
  accessReason: text('access_reason'),
  verifiedAt: integer('verified_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  uniqueIndex('idx_users_email').on(table.email),
  index('idx_users_status').on(table.status),
]);

export const verificationCodes = sqliteTable('verification_codes', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  codeHash: text('code_hash').notNull(),
  attempts: integer('attempts').notNull().default(0),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_verification_codes_email_created').on(table.email, table.createdAt)]);

export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
}, (table) => [index('idx_sessions_user_id').on(table.userId)]);

export const bots = sqliteTable('bots', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [uniqueIndex('idx_bots_user_name').on(table.userId, table.name)]);

export const botVersions = sqliteTable('bot_versions', {
  id: text('id').primaryKey(),
  botId: text('bot_id').notNull().references(() => bots.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  language: text('language', { enum: ['python', 'cpp', 'rust'] }).notNull(),
  filename: text('filename').notNull(),
  objectKey: text('object_key').notNull(),
  sha256: text('sha256').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  compileStatus: text('compile_status').notNull().default('pending'),
  createdAt: integer('created_at').notNull(),
}, (table) => [
  uniqueIndex('idx_bot_versions_bot_number').on(table.botId, table.versionNumber),
  index('idx_bot_versions_bot_created').on(table.botId, table.createdAt),
]);

export const matches = sqliteTable('matches', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  botVersionId: text('bot_version_id').references(() => botVersions.id, { onDelete: 'set null' }),
  opponentsJson: text('opponents_json').notNull(),
  status: text('status').notNull(),
  resultJson: text('result_json'),
  errorMessage: text('error_message'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, (table) => [
  index('idx_matches_user_created').on(table.userId, table.createdAt),
]);
