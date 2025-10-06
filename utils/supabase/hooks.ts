'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';
import { type QueryResult } from './server';

// Mutation result type
export type MutationResult<T = Record<string, unknown>> = {
  data: T | T[] | null;
  error: unknown;
  count?: number;
};

// Create browser client
export const createClient = () => {
  if (typeof window === 'undefined') {
    throw new Error('This client must be used within a client component');
  }
  
  // Check if we're in a browser environment
  if (!window.location) {
    throw new Error('Browser environment not available');
  }
  
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Hook return type for queries
export type UseSupabaseStoreReturn<T = Record<string, unknown>> = {
  data: T[],
  filters: Record<string, unknown>,
  loading: boolean,
  error: string | null,
  updateFilters: (newFilters: Record<string, unknown>) => void,
  refetch: () => Promise<void>
};

// Hook return type for mutations
export type UseMutationReturn<T = Record<string, unknown>> = {
  mutate: (...args: unknown[]) => Promise<MutationResult<T>>;
  loading: boolean;
  error: string | null;
  data: T | T[] | null;
};

// Client-side store class for mutations
class ClientSupabaseStore {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  // Insert operations
  async insert<T = Record<string, unknown>>(tableName: keyof Database['public']['Tables'], values: unknown): Promise<MutationResult<T>> {
    const response = await this.supabase
      .from(tableName)
      .insert(values as never)
      .select();
    
    return { 
      data: response.data as T | T[] | null, 
      error: response.error, 
      count: response.count ?? undefined 
    };
  }

  // Update operations
  async update<T = Record<string, unknown>>(
    tableName: keyof Database['public']['Tables'], 
    values: unknown, 
    filters?: Record<string, unknown>
  ): Promise<MutationResult<T>> {
    let query = this.supabase.from(tableName).update(values as never);
    
    // Apply filters if provided
    if (filters) {
      Object.entries(filters).forEach(([column, value]) => {
        query = query.eq(column, value as never);
      });
    }
    
    const response = await query.select();
    return { 
      data: response.data as T | T[] | null, 
      error: response.error, 
      count: response.count ?? undefined 
    };
  }

  // Delete operations
  async delete<T = Record<string, unknown>>(
    tableName: keyof Database['public']['Tables'], 
    filters: Record<string, unknown>
  ): Promise<MutationResult<T>> {
    let query = this.supabase.from(tableName).delete();
    
    // Apply filters - required for delete operations
    Object.entries(filters).forEach(([column, value]) => {
      query = query.eq(column, value as never);
    });
    
    const response = await query.select();
    return { 
      data: response.data as T | T[] | null, 
      error: response.error, 
      count: response.count ?? undefined 
    };
  }

  // Upsert operations
  async upsert<T = Record<string, unknown>>(
    tableName: keyof Database['public']['Tables'], 
    values: unknown
  ): Promise<MutationResult<T>> {
    const response = await this.supabase
      .from(tableName)
      .upsert(values as never)
      .select();
    
    return { 
      data: response.data as T | T[] | null, 
      error: response.error, 
      count: response.count ?? undefined 
    };
  }

  // Get the underlying client
  getClient() {
    return this.supabase;
  }
}

// Singleton instance for client store
let clientStore: ClientSupabaseStore | null = null;

const getClientStore = () => {
  if (!clientStore) {
    clientStore = new ClientSupabaseStore(createClient());
  }
  return clientStore;
};

// Function to extract user-modifiable filters from server searchParams
function extractUserFilters(searchParams: Record<string, string>): Record<string, unknown> {
  const userFilters: Record<string, unknown> = {};
  
  Object.entries(searchParams).forEach(([key, value]) => {
    // Only skip truly structural query parameters, not relational filters
    if (key === 'select') {
      return;
    }
    
    // Parse different filter patterns
    if (value.startsWith('eq.')) {
      const filterValue = value.replace('eq.', '');
      // Convert string values to appropriate types
      if (filterValue === 'true') {
        userFilters[key] = true;
      } else if (filterValue === 'false') {
        userFilters[key] = false;
      } else if (!isNaN(Number(filterValue))) {
        userFilters[key] = Number(filterValue);
      } else {
        userFilters[key] = filterValue;
      }
    } else if (value.startsWith('neq.')) {
      userFilters[`${key}_neq`] = value.replace('neq.', '');
    } else if (value.startsWith('gt.')) {
      userFilters[`${key}_gt`] = value.replace('gt.', '');
    } else if (value.startsWith('gte.')) {
      userFilters[`${key}_gte`] = value.replace('gte.', '');
    } else if (value.startsWith('lt.')) {
      userFilters[`${key}_lt`] = value.replace('lt.', '');
    } else if (value.startsWith('lte.')) {
      userFilters[`${key}_lte`] = value.replace('lte.', '');
    } else if (value.startsWith('like.')) {
      userFilters[`${key}_like`] = value.replace('like.', '');
    } else if (value.startsWith('ilike.')) {
      userFilters[`${key}_ilike`] = value.replace('ilike.', '');
    } else if (value.startsWith('in.(')) {
      const values = value.replace('in.(', '').replace(')', '').split(',');
      userFilters[`${key}_in`] = values;
    } else {
      // Default case - treat as equality filter
      userFilters[key] = value;
    }
  });
  
  return userFilters;
}

// Function to create a base query structure for a given table
function createBaseQuery<T>(supabase: SupabaseClient<Database>, queryResult: QueryResult<T>) {
  const { tableName, searchParams } = queryResult;
  const selectParam = searchParams.select || '*';
  const query = supabase.from(tableName as keyof Database['public']['Tables']).select(selectParam);
  
  return query;
}

// Main hook that takes a QueryResult and makes it reactive
export function useSupabaseStore<T = Record<string, unknown>>(
  initialQuery: QueryResult<T> | undefined
): UseSupabaseStoreReturn<T> {
  const [data, setData] = useState<T[]>(initialQuery?.data || []);
  // Initialize filters with user-modifiable filters from server query
  const [filters, setFilters] = useState<Record<string, unknown>>(extractUserFilters(initialQuery?.searchParams || {}));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to execute a query based on current filters
  const executeQuery = useCallback(async (currentFilters: Record<string, unknown>) => {
    console.log('executeQuery called with filters:', currentFilters);
    // Only create client when we actually need to execute a query
    if (typeof window === 'undefined') {
      // Skip execution on server-side
      return;
    }

    // If initialQuery is undefined, we can't execute a query
    if (!initialQuery) {
      console.log('initialQuery is undefined, skipping query execution');
      return;
    }

    const supabase = createClient();
    setLoading(true);
    setError(null);

    try {
      // Create a base query with the original structure from server
      console.log('Creating base query from initialQuery:', initialQuery);
      
      let query = createBaseQuery(supabase, initialQuery);

      // Apply additional filters based on the filter updates
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;

        console.log('Applying filter:', key, '=', value);

        // Handle different filter types based on key suffixes
        if (key.endsWith('_neq')) {
          const column = key.replace('_neq', '');
          query = query.neq(column, value as never);
        } else if (key.endsWith('_gt')) {
          const column = key.replace('_gt', '');
          query = query.gt(column, value as never);
        } else if (key.endsWith('_gte')) {
          const column = key.replace('_gte', '');
          query = query.gte(column, value as never);
        } else if (key.endsWith('_lt')) {
          const column = key.replace('_lt', '');
          query = query.lt(column, value as never);
        } else if (key.endsWith('_lte')) {
          const column = key.replace('_lte', '');
          query = query.lte(column, value as never);
        } else if (key.endsWith('_like')) {
          const column = key.replace('_like', '');
          query = query.like(column, value as string);
        } else if (key.endsWith('_ilike')) {
          const column = key.replace('_ilike', '');
          query = query.ilike(column, value as string);
        } else if (key.endsWith('_in')) {
          const column = key.replace('_in', '');
          query = query.in(column, value as never[]);
        } else if (key === 'order') {
          const values = (value as string).split('.');
          const ascending = values.pop() === 'asc';
          query = query.order(values.join('.'), { ascending });
        } else {
          // Default to equality - key can include dots for relational filters
          query = query.eq(key, value as never);
        }
      });
      
      const { data: result, error: queryError } = await query;

      if (queryError) {
        console.error('Query error:', queryError);
        throw queryError;
      }

      console.log('Query result:', result);
      setData((result || []) as T[]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Query execution error:', err);
    } finally {
      setLoading(false);
    }
  }, [initialQuery]);

  // Function to update filters
  const updateFilters = useCallback((newFilters: Record<string, unknown>) => {
    console.log('updateFilters called with:', newFilters);
    setFilters(prev => {
      const updated = { ...prev };
      
      // Add or update new filters, removing null/empty values
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
          delete updated[key];
        } else {
          updated[key] = value;
        }
      });
      
      console.log('Filters updated from:', prev, 'to:', updated);
      return updated;
    });
  }, []);

  // Function to manually refetch
  const refetch = useCallback(() => {
    return executeQuery(filters);
  }, [executeQuery, filters]);

  // Effect to refetch when filters change
  useEffect(() => {
    console.log('useEffect triggered with filters:', filters);
    // Only refetch if filters have actually changed from initial and we're on the client
    if (typeof window !== 'undefined') {
      const filtersChanged = Object.keys(filters).length > 0;
      console.log('filtersChanged:', filtersChanged, 'filters length:', Object.keys(filters).length);
      if (filtersChanged) {
        console.log('Executing query with filters:', filters);
        executeQuery(filters);
      } else {
        console.log('Using initial data');
        setData(initialQuery?.data || []);
      }
    }
  }, [filters, executeQuery, initialQuery?.data]);

  return {data, filters, loading, error, updateFilters, refetch};
}

// Hook for insert mutations
export function useInsert<T = Record<string, unknown>>(tableName: keyof Database['public']['Tables']): UseMutationReturn<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | T[] | null>(null);
  const store = getClientStore();

  const mutate = useCallback(async (...args: unknown[]): Promise<MutationResult<T>> => {
    const values = args[0];
    setLoading(true);
    setError(null);
    
    try {
      const result = await store.insert<T>(tableName, values);
      if (result.error) {
        throw result.error;
      }
      setData(result.data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [store, tableName]);

  return { mutate, loading, error, data };
}

// Hook for update mutations
export function useUpdate<T = Record<string, unknown>>(tableName: keyof Database['public']['Tables']): UseMutationReturn<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | T[] | null>(null);
  const store = getClientStore();

  const mutate = useCallback(async (...args: unknown[]): Promise<MutationResult<T>> => {
    const values = args[0];
    const options = args[1] as { filters?: Record<string, unknown> } | undefined;
    setLoading(true);
    setError(null);
    
    try {
      const result = await store.update<T>(tableName, values, options?.filters);
      if (result.error) {
        throw result.error;
      }
      setData(result.data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [store, tableName]);

  return { mutate, loading, error, data };
}

// Hook for delete mutations
export function useDelete<T = Record<string, unknown>>(tableName: keyof Database['public']['Tables']): UseMutationReturn<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | T[] | null>(null);
  const store = getClientStore();

  const mutate = useCallback(async (...args: unknown[]): Promise<MutationResult<T>> => {
    const filters = args[0] as Record<string, unknown>;
    setLoading(true);
    setError(null);
    
    try {
      const result = await store.delete<T>(tableName, filters);
      if (result.error) {
        throw result.error;
      }
      setData(result.data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [store, tableName]);

  return { mutate, loading, error, data };
}

// Hook for upsert mutations
export function useUpsert<T = Record<string, unknown>>(tableName: keyof Database['public']['Tables']): UseMutationReturn<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | T[] | null>(null);
  const store = getClientStore();

  const mutate = useCallback(async (...args: unknown[]): Promise<MutationResult<T>> => {
    const values = args[0];
    setLoading(true);
    setError(null);
    
    try {
      const result = await store.upsert<T>(tableName, values);
      if (result.error) {
        throw result.error;
      }
      setData(result.data);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [store, tableName]);

  return { mutate, loading, error, data };
}
