CREATE TYPE "public"."rolesEnum" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TABLE "organisation_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organisation_memberships" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organisations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "rolesEnum" DEFAULT 'user' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_uploads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" text,
	"avatar_url" text
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "organisation_memberships" ADD CONSTRAINT "organisation_memberships_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisation_memberships" ADD CONSTRAINT "organisation_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_uploads" ADD CONSTRAINT "user_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "organisation_memberships" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((
      select organisation_memberships.user_id = auth.uid()
      from organisation_memberships
      where organisation_memberships.organisation_id = id
    ));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "organisation_memberships" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "organisation_memberships" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "organisation_memberships" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "organisations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((
      select organisation_memberships.user_id = auth.uid()
      from organisation_memberships
      where organisation_memberships.organisation_id = id
    ));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "organisations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "organisations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "organisations" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "roles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "roles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "roles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "roles" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "user_uploads" AS PERMISSIVE FOR SELECT TO "authenticated" USING (user_id = auth.uid());--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "user_uploads" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "user_uploads" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "user_uploads" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "users" AS PERMISSIVE FOR SELECT TO "authenticated" USING (id = auth.uid());--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "users" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "users" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "users" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);

-- Create a trigger function to handle new user signup from invitations
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into public.users table
  INSERT INTO public.users (id, full_name, avatar_url)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Set user role from metadata or default to 'user'
  INSERT INTO public.roles (user_id, role)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'system_role', 'user')::public."rolesEnum"
  );

  -- If user was invited to an organisation, add them to it
  IF NEW.raw_user_meta_data ? 'organisation_id' AND NEW.raw_user_meta_data ? 'organisation_role' THEN
    INSERT INTO public.organisation_memberships (user_id, organisation_id, role)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'organisation_id',
      NEW.raw_user_meta_data->>'organisation_role'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after user is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();
