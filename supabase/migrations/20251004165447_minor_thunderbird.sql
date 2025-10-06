CREATE TABLE "meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start_date" timestamp with time zone NOT NULL,
	"week_end_date" timestamp with time zone NOT NULL,
	"plan_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meal_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
	"tags" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "meal_plans" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "meal_plans" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "meal_plans" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "meal_plans" AS PERMISSIVE FOR DELETE TO "authenticated" USING (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "recipes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "recipes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "recipes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "recipes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (user_id = auth.uid());