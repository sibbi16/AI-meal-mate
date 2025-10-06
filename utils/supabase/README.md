# Supabase Store & Hooks

An elegant Supabase integration that provides seamless server-to-client query continuity with zero query duplication. Write your query once on the server, get both data and reactive client-side filtering automatically.

## Key Features

- **🎯 Zero Query Duplication**: Define queries once on server, get both data and client reactivity
- **🔄 Seamless Server-to-Client**: Server queries automatically become reactive on the client
- **🏷️ Full Type Safety**: Complete TypeScript support with official Supabase client
- **⚡ Smart Filter Reconstruction**: Client reconstructs server query structure + adds dynamic filters
- **🧹 Clean Architecture**: No complex proxies, just elegant utility functions
- **🔧 Official Supabase**: Built on top of the official client, no reinventing the wheel

## How It Works

1. **Server**: Use `executeWithMetadata()` to capture query URL and execute
2. **Client**: `useSupabaseStore()` reconstructs base query + applies user filters
3. **Reactive**: Filter changes trigger fresh queries with proper Supabase syntax

## Quick Start

### 1. Server-Side: Execute Queries with Metadata

```typescript
// app/page.tsx
'use server';

import { createClient, executeWithMetadata } from '@/utils/supabase/server';
import { Tables } from '@/utils/supabase/types';

// Define the expected shape of the data
export type ProductWithPrices = Tables<'products'> & {
  prices: Tables<'prices'>[];
};

export default async function ProductsPage() {
  const supabase = createClient();
  
  // Build your query using the official Supabase client
  const productsQuery = supabase
    .from('products')
    .select('*, prices(*)')
    .eq('active', true)
    .eq('prices.active', true)
    .order('metadata->index')
    .order('unit_amount', { foreignTable: 'prices' });

  // Execute with metadata capture - this runs the query AND captures URL/params
  const productsQueryResult = await executeWithMetadata<ProductWithPrices>(productsQuery);

  // Pass the query result to the client
  return <ProductsList productsQuery={productsQueryResult} />;
}
```

### 2. Client-Side: Reactive Hooks

```typescript
// components/ProductsList.tsx
'use client';

import { useSupabaseStore } from '@/utils/supabase/hooks';
import type { QueryResult } from '@/utils/supabase/server';
import { ProductWithPrices } from '@/app/page';

interface Props {
  productsQuery: QueryResult<ProductWithPrices>;
}

export default function ProductsList({ productsQuery }: Props) {
  // Hook automatically reconstructs server query + handles user filters
  const {data: products, filters, loading, error, updateFilters, refetch} = useSupabaseStore(productsQuery);
  
  return (
    <div>
      {/* Search input - adds ilike filter on top of base query */}
      <input 
        type="text"
        value={filters.name_ilike ? filters.name_ilike.replace(/%/g, '') : ''}
        onChange={(e) => updateFilters({ 
          name_ilike: e.target.value ? `%${e.target.value}%` : null 
        })}
        placeholder="Search products..."
      />
      
      {/* Checkbox - pre-filled from server query (active=true) */}
      <input 
        type="checkbox"
        checked={filters.active || false}
        onChange={(e) => updateFilters({ active: e.target.checked })}
      />
      
      {/* Results */}
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      
      {/* Displays the server loaded products on page load, and updates when filters change */}
      {products.map((product) => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>{product.description}</p>
        </div>
      ))}
    </div>
  );
}
```

## API Reference

### Server-Side (`utils/supabase/server.ts`)

#### `executeWithMetadata<T>(query, tableName): Promise<QueryResult<T>>`

Executes a Supabase query and captures metadata for client-side reconstruction.

```typescript
const queryResult = await executeWithMetadata<ProductWithPrices>(
  supabase.from('products').select('*, prices(*)').eq('active', true)
);

// Returns QueryResult with:
// - data: T[] - Query results
// - queryKey: string - Unique identifier
// - tableName: string - Table name
// - url: string - Full query URL
// - searchParams: Record<string, string> - Parsed URL parameters
```

#### Query Building (Official Supabase Client)

```typescript

// automatically authenticates using the current user's session
const supabase = createClient();

// All official Supabase methods work
const query = supabase
  .from('products')
  .select('*, prices(*), categories(*)')
  .eq('active', true)
  .gte('price', 100)
  .order('created_at', { ascending: false })
  .limit(10);

const result = await executeWithMetadata(query);
```

### Client-Side (`utils/supabase/hooks.ts`)

#### `useSupabaseStore(queryResult): [data, filters, loading, error, updateFilters, refetch]`

Takes a server QueryResult and makes it reactive with client-side filtering.

```typescript
const [
  data,           // T[] - Current filtered data
  filters,        // Record<string, any> - Current filter state
  loading,        // boolean - Loading state
  error,          // string | null - Error message
  updateFilters,  // (filters) => void - Update filters
  refetch         // () => Promise<void> - Manual refetch
] = useSupabaseStore(productsQuery);
```

#### Filter Operations

The hook supports all Supabase filter operations via naming conventions:

```typescript
updateFilters({
  // Equality (default)
  name: 'Product Name',
  active: true,
  
  // Comparison operators  
  price_gt: 100,           // price > 100
  price_gte: 100,          // price >= 100
  price_lt: 1000,          // price < 1000
  price_lte: 1000,         // price <= 1000
  
  // Text search
  name_like: '%search%',    // SQL LIKE (case sensitive)
  name_ilike: '%search%',   // SQL ILIKE (case insensitive)
  
  // Array operations
  status_in: ['active', 'pending'],  // status IN (...)
  
  // Not equal
  category_neq: 'archived'  // category != 'archived'
});
```

#### Removing Filters

Set filters to `null`, `undefined`, or empty string to remove them:

```typescript
updateFilters({ 
  name_ilike: null,     // Removes name filter
  active: undefined,    // Removes active filter
  category: ''          // Removes category filter
});
```

## How Filter Reconstruction Works

### 1. Server Query Parameters Captured

```typescript
// Server query:
supabase.from('products')
  .select('*, prices(*)')
  .eq('active', true)
  .eq('prices.active', true)
  .order('metadata->index')

// Becomes URL parameters:
{
  'select': '*,prices(*)',
  'active': 'eq.true',
  'prices.active': 'eq.true', 
  'order': 'metadata->index.asc'
}
```

### 2. Server passes URL parameters to client

```typescript
// Server executes query and passes URL parameters and data to client
const productsQuery = await executeWithMetadata<ShapeOfData>(query);
// productsQuery contains a neat bundle of everything the client needs to set up the hook

// Client receives QueryResult with URL parameters
<ClientComponent productsQuery={productsQuery} />
```

### 3. Client Reconstructs Query Structure

```typescript
// Client receives QueryResult with URL parameters
const {data: products, filters, loading, error, updateFilters} = useSupabaseStore(productsQuery);

// The hook reconstructs the query structure from the URL parameters
const query = supabase
  .from('products')
  .select('*, prices(*)')
  .eq('active', true)
  .eq('prices.active', true)
  .order('metadata->index')
```

## Filter State Pre-population

The hook automatically extracts user-modifiable filters from server parameters:

```typescript
// Server URL: ?active=eq.true&category=eq.electronics&order=name.asc

// Extracted to filters state:
{
  active: true,        // eq.true → boolean true
  category: 'electronics'  // eq.electronics → string
}
```

## Advanced Examples

### Complex Queries with Joins

```typescript
// Server
const ordersQuery = supabase
  .from('orders')
  .select(`
    *,
    customer:customers(*),
    order_items(
      *,
      product:products(*)
    )
  `)
  .eq('status', 'active')
  .gte('created_at', '2023-01-01')
  .order('created_at', { ascending: false });

const ordersResult = await executeWithMetadata(ordersQuery);

// Client - same complex query structure maintained
const {data: orders, filters, loading, error, updateFilters} = useSupabaseStore(ordersResult);

// Add filters on top of complex base query
updateFilters({
  customer_name_ilike: '%john%',
  total_gte: 100
});
```

### Multiple Parallel Queries

```typescript
// Server
const [productsResult, categoriesResult, userResult] = await Promise.all([
  executeWithMetadata(
    supabase.from('products').select('*').eq('active', true)
  ),
  executeWithMetadata(
    supabase.from('categories').select('*').order('name')
  ),
  supabase.auth.getUser()
]);

// Client
const {data: products, filters: productFilters, updateFilters: updateProductFilters} = useSupabaseStore(productsResult);
const {data: categories, filters: categoryFilters, updateFilters: updateCategoryFilters} = useSupabaseStore(categoriesResult);
```

## Migration Guide

### From Manual Query Duplication

**Before:**
```typescript
// Server (app/page.tsx)
const products = await supabase.from('products').select('*').eq('active', true);

// Client (component.tsx) - DUPLICATE QUERY!
const handleSearch = async (term) => {
  const { data } = await supabase
    .from('products')
    .select('*')
    .eq('active', true)        // Must remember all server filters
    .ilike('name', `%${term}%`);
  setProducts(data);
};
```

**After:**
```typescript
// Server (app/page.tsx)
const productsResult = await executeWithMetadata(
  supabase.from('products').select('*').eq('active', true)
);

// Client (component.tsx) - NO DUPLICATION!
const {data: products, filters, updateFilters} = useSupabaseStore(productsResult);
const handleSearch = (term) => updateFilters({ name_ilike: `%${term}%` });
```

### From Custom Query Builders

**Before:**
```typescript
// Complex proxy/wrapper implementations
const trackedClient = createTrackedClient();
const { data, queryMeta } = await trackedClient.from('products').execute();
```

**After:**
```typescript
// Simple utility with official client
const result = await executeWithMetadata(
  supabase.from('products').select('*')
);
```

## Page Structure Patterns

### Data-Fetching Pages
For pages that fetch data, follow the server-to-client pattern:

```typescript
// app/products/page.tsx (Server Component)
import { executeWithMetadata } from '@/utils/supabase/server';
import { ProductsList } from './products-list';

export default async function ProductsPage() {
  const supabase = createClient();
  const productsQuery = await executeWithMetadata(
    supabase.from('products').select('*')
  );
  
  return <ProductsList productsQuery={productsQuery} />;
}

// app/products/products-list.tsx (Client Component)
'use client';
import { useSupabaseStore } from '@/utils/supabase/hooks';

export function ProductsList({ productsQuery }) {
  const { data: products, filters, updateFilters } = useSupabaseStore(productsQuery);
  // ...
}
```

### Form/Action Pages
For pages with forms or actions that don't fetch initial data:

```typescript
// app/products/new/page.tsx (Server Component)
import { NewProductForm } from './client';

export default function NewProductPage() {
  // Server component - could fetch initial data if needed
  // e.g., categories, user preferences, etc.
  
  return <NewProductForm />;
}

// app/products/new/client.tsx (Client Component) 
'use client';
export function NewProductForm() {
  // All form logic and state management
}

// app/products/new/actions.ts (Server Actions)
'use server';
export async function createProductAction(data) {
  // Server-side form processing
}
```

For pages with forms that do require data fetching such as edit forms:

```typescript
// app/products/edit/[id]/page.tsx (Server Component)
import { executeWithMetadata } from '@/utils/supabase/server';
import { ProductEditForm } from './client';

export default async function EditProductPage({ params }) {
  const { id } = await params;
  const productQuery = await executeWithMetadata(supabase.from('products').select('*').eq('id', id));
  return <ProductEditForm productQuery={productQuery} />;
}

// app/products/edit/[id]/client.tsx (Client Component)
'use client';
import { useSupabaseStore } from '@/utils/supabase/hooks';

export function ProductEditForm({ productQuery }) {
  const { data: products, filters, updateFilters } = useSupabaseStore(productQuery);
  
  return (
    <form action={updateProduct}>
      <input type="text" value={products[0]?.name} name="name" />
      <button type="submit">Save</button>
    </form>
  );
}

// app/products/edit/[id]/actions.ts (Server Actions)
'use server';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export async function updateProduct(formData: FormData) {
  // process the form data on the server
  const supabase = createClient();
  const id = formData.get('id');
  const name = formData.get('name');
  await supabase.from('products').update({ name }).eq('id', id);
  return redirect('/admin/products');
}
```

This structure ensures:
- ✅ **Pages are always server components** (Next.js App Router best practice)
- ✅ **Clear separation** between server and client logic
- ✅ **Future-ready** for adding server-side data fetching
- ✅ **Consistent patterns** across your application

## Benefits

✅ **Zero Query Duplication** - Write once, use everywhere  
✅ **Full Type Safety** - Official Supabase TypeScript support  
✅ **No Learning Curve** - Standard Supabase API  
✅ **Future Proof** - Built on official client, gets updates automatically  
✅ **Clean Architecture** - Simple utility functions, no complex abstractions  
✅ **Smart Reconstruction** - Automatically handles query structure vs user filters  
✅ **Pre-populated State** - UI controls reflect server query state  
✅ **Proper Next.js Structure** - Server components for pages, client components for interactivity

This approach gives you the best of both worlds: the simplicity and type safety of the official Supabase client with powerful server-to-client query continuity.
