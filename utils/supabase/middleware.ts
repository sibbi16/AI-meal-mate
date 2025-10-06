import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const updateSession = async (request: NextRequest) => {
  const supabase = createClient();

  // This will refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  await supabase.auth.getUser();

  return NextResponse.next();
};
