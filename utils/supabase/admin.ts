import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/utils/supabase/types';

export const createAdminClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
};