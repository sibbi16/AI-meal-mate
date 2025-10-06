import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database, Tables } from './types';
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

// User with roles type for auth context
export interface UserWithRoles extends Tables<'users'> {
  roles: Tables<'roles'>[];
}

// Simple wrapper to store query metadata for hooks
export type QueryResult<T = Record<string, unknown>> = {
  queryKey: string;
  data: T[];
  tableName: string;
  url: string;
  searchParams: Record<string, string>;
};

// Create server client function
export const createClient = (): SupabaseClient<Database> => {
  if (typeof window !== 'undefined') {
    throw new Error('createClient must be called from the server. Use createClient from hooks instead.');
  }

  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          return (await cookieStore).get(name)?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            (await cookieStore).set({ name, value, ...options });
          } catch (error) {
            // If the set method is called from a Server Component, an error may occur
            // This can be ignored if there is middleware refreshing user sessions
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            (await cookieStore).set({ name, value: '', ...options });
          } catch (error) {
            // If the remove method is called from a Server Component, an error may occur
            // This can be ignored if there is middleware refreshing user sessions
          }
        }
      }
    }
  );
};

// Utility function to execute a query and capture its metadata
export async function executeWithMetadata<T>(
  query: PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<QueryResult<T>> {
  const { data, error } = await query;
  if (error) {
    // Handle different types of errors
    let message = 'Unknown error';
    let details = 'No details available';
    let hint = 'No hint available';
    let code = 'No error code';
    
    if (error && typeof error === 'object') {
      const errorObj = error as { 
        message?: string; 
        details?: string; 
        hint?: string; 
        code?: string; 
      };
      message = errorObj?.message || message;
      details = errorObj?.details || details;
      hint = errorObj?.hint || hint;
      code = errorObj?.code || code;
    } else if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'string') {
      message = error;
    }
    
    // Create a more descriptive error message
    const errorMessage = message !== 'Unknown error'
      ? `Supabase query failed: ${message}${details !== 'No details available' ? ` - ${details}` : ''}${hint !== 'No hint available' ? ` (Hint: ${hint})` : ''}`
      : `Supabase query failed with error: ${JSON.stringify(error)}`;
    
    throw new Error(errorMessage);
  }

  // Since we can't access the protected URL property, we'll generate a simple query key
  const queryKey = `query_${Date.now()}_${Math.random()}`;
  const tableName = 'unknown';
  const url = '';
  const searchParams: Record<string, string> = {};
  
  const queryResult: QueryResult<T> = {
    queryKey,
    data: data || [],
    tableName,
    url,
    searchParams,
  };

  return queryResult;
}

export async function getCurrentUserQueryResult(supabase?: SupabaseClient<Database>) {
  if (!supabase) {
    supabase = createClient();
  }
  const {data: userData} = await supabase.auth.getUser();
  if (userData.user) {
    return executeWithMetadata(
      supabase
        .from('users')
        .select('*, roles(*)')
        .eq('id', userData.user.id)
        .limit(1)
    );
  }
  else {
    return {
      queryKey: 'current_user',
      data: [],
      tableName: 'users',
      url: '',
      searchParams: {}
    }
  }
}