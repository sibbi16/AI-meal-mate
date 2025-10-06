import type { Config } from 'drizzle-kit';

export default {
  schema: './supabase/schemas/**/*.ts',
  out: './supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL as string
  },
  migrations: {
    prefix: 'supabase'
  }
} satisfies Config; 