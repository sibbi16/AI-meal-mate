-- Migrate meal_plans schema to support multiple plan types and generic periods
ALTER TABLE public.meal_plans
  RENAME COLUMN week_start_date TO period_start_date;

ALTER TABLE public.meal_plans
  RENAME COLUMN week_end_date TO period_end_date;

-- Rename index if it exists (older migrations may have created it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'meal_plans_week_start_date_idx'
  ) THEN
    ALTER INDEX public.meal_plans_week_start_date_idx RENAME TO meal_plans_period_start_date_idx;
  END IF;
END
$$;

ALTER TABLE public.meal_plans
  ADD COLUMN plan_type text NOT NULL DEFAULT 'weekly';

ALTER TABLE public.meal_plans
  ADD COLUMN period_label text;

-- Backfill period_label for existing weekly plans
UPDATE public.meal_plans
SET period_label = to_char(period_start_date, 'IYYY-"W"IW')
WHERE period_label IS NULL;
