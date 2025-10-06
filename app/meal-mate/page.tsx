import { createClient, getCurrentUserQueryResult } from '@/utils/supabase/server';
import { MealMateClient } from './client';
import { redirect } from 'next/navigation';

export default async function MealMatePage() {
  const supabase = createClient();
  const userQueryResult = await getCurrentUserQueryResult(supabase);
  
  const user = userQueryResult.data?.[0] || null;
  
  if (!user) {
    redirect('/auth/login');
  }

  return <MealMateClient user={user} />;
}
