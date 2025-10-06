'use server';

import {
  createClient,
  executeWithMetadata,
  QueryResult,
  getCurrentUserQueryResult
} from '@/utils/supabase/server';
import { Tables } from '@/utils/supabase/types';
import { Client } from './client';

export default async function HomePage() {
  const supabase = createClient();
  
  // Build your queries here
  const userQueryResult = await getCurrentUserQueryResult(supabase);

  return (
    <>
      <Client userQueryResult={userQueryResult} />
    </>
  );
}
