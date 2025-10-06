# How to Apply the Meal Mate Migration

## Your Setup

You're using **Supabase Local** with **Drizzle ORM**. The migration file is already created and formatted correctly.

## Steps to Apply Migration

### Option 1: Reset Database (Recommended - Fresh Start)

This will apply ALL migrations including the new one:

```bash
# Stop your dev server first
npm run supabase:stop

# Reset database (applies all migrations)
npm run supabase:reset

# Or if you have these commands:
npx supabase db reset
```

This will:
- Drop all tables
- Re-run all migrations (including your new recipes tables)
- Re-seed the database with test data

### Option 2: Apply Just This Migration (Manual)

1. **Open Supabase Studio**: http://127.0.0.1:54323

2. **Go to SQL Editor**

3. **Copy and paste this SQL** (from the migration file):

```sql
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"ingredients" jsonb NOT NULL,
	"instructions" jsonb NOT NULL,
	"prep_time" text,
	"cook_time" text,
	"servings" integer,
	"image_url" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "recipes" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start_date" timestamp with time zone NOT NULL,
	"week_end_date" timestamp with time zone NOT NULL,
	"plan_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "meal_plans" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "recipes_user_id_idx" ON "recipes" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "recipes_created_at_idx" ON "recipes" USING btree ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "meal_plans_user_id_idx" ON "meal_plans" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "meal_plans_week_start_date_idx" ON "meal_plans" USING btree ("week_start_date" DESC);

CREATE POLICY "crud-authenticated-policy-select" ON "recipes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = auth.uid());
CREATE POLICY "crud-authenticated-policy-insert" ON "recipes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (user_id = auth.uid());
CREATE POLICY "crud-authenticated-policy-update" ON "recipes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "crud-authenticated-policy-delete" ON "recipes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (user_id = auth.uid());

CREATE POLICY "crud-authenticated-policy-select" ON "meal_plans" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = auth.uid());
CREATE POLICY "crud-authenticated-policy-insert" ON "meal_plans" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (user_id = auth.uid());
CREATE POLICY "crud-authenticated-policy-update" ON "meal_plans" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "crud-authenticated-policy-delete" ON "meal_plans" AS PERMISSIVE FOR DELETE TO "authenticated" USING (user_id = auth.uid());
```

4. **Click Run** (or press Ctrl+Enter)

5. **Verify** - Go to Table Editor, you should see `recipes` and `meal_plans` tables

## Verify It Worked

Run this query in SQL Editor:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('recipes', 'meal_plans');
```

Should return 2 rows.

## After Migration

1. **Restart your Next.js app**:
   ```bash
   npm run dev
   ```

2. **Login** with the test user:
   - Email: `admin@decodifi.uk`
   - Password: `mHMGB1uzkdfQ16xU`

3. **Test saving a recipe**:
   - Go to http://localhost:3000/meal-mate
   - Upload an image or enter a recipe
   - Click "Save Recipe"
   - Should work now! ✅

## Troubleshooting

### "relation already exists"
The tables are already created. Check if they exist:
```sql
\dt recipes
\dt meal_plans
```

### "Failed to save recipe" still appears
1. Check if you're logged in
2. Verify tables exist
3. Check browser console for detailed error
4. Verify RLS policies are created:
```sql
SELECT * FROM pg_policies WHERE tablename IN ('recipes', 'meal_plans');
```

### Need to start fresh?
```bash
npm run supabase:stop
npm run supabase:reset
npm run dev
```

## Quick Commands Reference

```bash
# Check Supabase status
npx supabase status

# Stop Supabase
npx supabase stop

# Start Supabase
npx supabase start

# Reset database (applies all migrations)
npx supabase db reset

# View logs
npx supabase logs
```

## Success Checklist

- [ ] Migration file exists: `supabase/migrations/20251004213852_meal_mate_tables.sql`
- [ ] Tables created: `recipes` and `meal_plans`
- [ ] RLS policies created
- [ ] Next.js app restarted
- [ ] Logged in as test user
- [ ] Can save recipes successfully

Once all checked, you're good to go! 🎉
