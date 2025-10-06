import { pgTable, pgEnum, uuid, text, boolean, integer, bigint, timestamp, jsonb, pgPolicy } from 'drizzle-orm/pg-core';
import { crudPolicy } from 'drizzle-orm/neon';
import { authenticatedRole, anonRole } from 'drizzle-orm/supabase';
import { sql } from 'drizzle-orm';

// Users table (define first to avoid reference errors)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').notNull().default(true),
}, t => [
  crudPolicy({
    read: sql`id = auth.uid()`,
    modify: false,
    role: authenticatedRole,
  })
]);

export const rolesEnum = pgEnum('rolesEnum', ['admin', 'user']);

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: rolesEnum('role').notNull().default('user'),
}, t => [
  crudPolicy({
    read: sql`user_id = auth.uid()`,
    modify: false,
    role: authenticatedRole,
  })
]);

// Optional organisational login
export const organisations = pgTable('organisations', {
  id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  crudPolicy({
    // auth.uid() in the organisation_memberships table
    read: sql`(
      select organisation_memberships.user_id = auth.uid()
      from organisation_memberships
      where organisation_memberships.organisation_id = id
    )`,
    modify: false,
    role: authenticatedRole,
  })
]);

// Organisation memberships table
export const organisationMemberships = pgTable('organisation_memberships', {
  id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
  organisationId: uuid('organisation_id').notNull().references(() => organisations.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: text('role').notNull(),
}, t => [
  crudPolicy({
    // can only see members from the same organisation
    read: true,
    modify: false,
    role: authenticatedRole,
  })
]);

// uploads table
export const userUploads = pgTable('user_uploads', {
  id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id),
  fileUrl: text('file_url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  crudPolicy({
    read: sql`user_id = auth.uid()`,
    modify: false,
    role: authenticatedRole,
  })
]);

// Recipes table for Meal Mate
export const recipes = pgTable('recipes', {
  id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  ingredients: jsonb('ingredients').notNull(),
  instructions: jsonb('instructions').notNull(),
  prepTime: text('prep_time'),
  cookTime: text('cook_time'),
  servings: integer('servings'),
  imageUrl: text('image_url'),
  tags: jsonb('tags'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  crudPolicy({
    read: sql`user_id = auth.uid()`,
    modify: sql`user_id = auth.uid()`,
    role: authenticatedRole,
  })
]);

// Meal Plans table for Meal Mate
export const mealPlans = pgTable('meal_plans', {
  id: uuid('id').primaryKey().notNull().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').notNull().references(() => users.id),
  periodStartDate: timestamp('period_start_date', { withTimezone: true }).notNull(),
  periodEndDate: timestamp('period_end_date', { withTimezone: true }).notNull(),
  planType: text('plan_type').notNull().default(sql`'weekly'`),
  periodLabel: text('period_label'),
  planData: jsonb('plan_data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  crudPolicy({
    read: sql`user_id = auth.uid()`,
    modify: sql`user_id = auth.uid()`,
    role: authenticatedRole,
  })
]);
